import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, isNull, inArray, and, sql } from "drizzle-orm";
import type { CloudflareBindings, AppVariables } from "../../types/bindings";
import { invalidateCachePrefix, CACHE_PREFIXES } from "../../middleware/cache";
import { enrichGames } from "../../services/enrichment";
import {
  games,
  game_details,
  circana_reports,
  circana_market_totals,
  circana_entries,
} from "../../db/schema";

const app = new Hono<{
  Bindings: CloudflareBindings;
  Variables: AppVariables;
}>();

const EntrySchema = z.object({
  chart_type: z.enum(["overall", "nintendo", "playstation", "xbox"]),
  rank: z.number().int().min(1).max(1000),
  last_month_rank: z.number().int().min(1).max(1000).nullable().optional(),
  is_new_entry: z.boolean().optional(),
  flags: z
    .object({
      no_nintendo_digital: z.boolean().optional(),
      no_digital: z.boolean().optional(),
      no_nintendo_xbox_digital: z.boolean().optional(),
    })
    .strict()
    .optional(),
  game: z.object({
    title_en: z.string().min(1).max(500),
  }),
});

const IngestSchema = z.object({
  year: z.number().int().min(2000).max(2035),
  month: z.number().int().min(1).max(12).nullable().optional(),
  period_type: z.enum(["monthly", "annual"]),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tracking_weeks: z.number().int().min(1).max(53).optional(),
  market_totals: z
    .object({
      total_market_spend: z.number().nonnegative().optional(),
      content_spend: z.number().nonnegative().optional(),
      hardware_spend: z.number().nonnegative().optional(),
      accessory_spend: z.number().nonnegative().optional(),
      notes: z.string().max(1000).optional(),
    })
    .optional(),
  entries: z.array(EntrySchema).min(1).max(200),
});

const UpdateGameSchema = z.object({
  title_en: z.string().min(1).max(500).optional(),
  igdb_id: z.number().int().positive().nullable().optional(),
  release_date_us: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  cover_url: z.string().url().max(2000).optional(),
});

function scheduleEnrichment(
  env: CloudflareBindings,
  executionCtx: ExecutionContext,
  ids: number[],
): Promise<void> {
  if (env.IGDB_ENRICHMENT_QUEUE) {
    return env.IGDB_ENRICHMENT_QUEUE.send({ game_ids: ids });
  }
  executionCtx.waitUntil(enrichGames(env, ids));
  return Promise.resolve();
}

app.post("/ingest/circana", zValidator("json", IngestSchema), async (c) => {
  const payload = c.req.valid("json");
  const db = c.get("db");

  const warnings: string[] = [];
  let inserted_count = 0;
  let reportId: number;
  const newGameIds: number[] = [];
  try {
    // 1. Upsert report
    const existingReport = await db
      .select({ id: circana_reports.id })
      .from(circana_reports)
      .where(
        and(
          eq(circana_reports.year, payload.year),
          eq(circana_reports.period_type, payload.period_type),
          payload.month != null
            ? eq(circana_reports.month, payload.month)
            : isNull(circana_reports.month),
        ),
      )
      .limit(1);

    if (existingReport.length > 0) {
      reportId = existingReport[0].id;
    } else {
      const inserted = await db
        .insert(circana_reports)
        .values({
          year: payload.year,
          month: payload.month ?? null,
          period_type: payload.period_type,
          period_start: payload.period_start,
          period_end: payload.period_end,
          tracking_weeks: payload.tracking_weeks ?? null,
        })
        .returning({ id: circana_reports.id });
      reportId = inserted[0].id;
    }

    // 2. Upsert market totals
    if (payload.market_totals) {
      await db.insert(circana_market_totals).values({
        report_id: reportId,
        ...payload.market_totals,
      });
    }

    // 3. Batch-resolve games: fetch existing, insert missing
    const uniqueTitles = [
      ...new Set(payload.entries.map((e) => e.game.title_en)),
    ];

    const existingGames = await db
      .select({ id: games.id, title_en: games.title_en })
      .from(games)
      .where(inArray(games.title_en, uniqueTitles));

    const titleToGameId = new Map<string, number>(
      existingGames.map((g) => [g.title_en, g.id]),
    );

    const missingTitles = uniqueTitles.filter((t) => !titleToGameId.has(t));
    if (missingTitles.length > 0) {
      const inserted = await db
        .insert(games)
        .values(missingTitles.map((title_en) => ({ title_en })))
        .returning({ id: games.id, title_en: games.title_en });
      for (const g of inserted) {
        titleToGameId.set(g.title_en, g.id);
        newGameIds.push(g.id);
      }
    }

    // 4. Upsert circana_entries — idempotent on re-ingest
    const entryValues = payload.entries.map((entry) => ({
      report_id: reportId,
      game_id: titleToGameId.get(entry.game.title_en)!,
      chart_type: entry.chart_type,
      rank: entry.rank,
      last_month_rank: entry.last_month_rank ?? null,
      is_new_entry: entry.is_new_entry ?? false,
      flags: entry.flags ? JSON.stringify(entry.flags) : null,
    }));

    // Chunk entryValues into sizes of 10 to avoid D1 SQLite parameter limits (8 cols * 10 = 80 params)
    const chunkSize = 10;
    for (let i = 0; i < entryValues.length; i += chunkSize) {
      const chunk = entryValues.slice(i, i + chunkSize);
      await db
        .insert(circana_entries)
        .values(chunk)
        .onConflictDoUpdate({
          target: [
            circana_entries.report_id,
            circana_entries.game_id,
            circana_entries.chart_type,
          ],
          set: {
            rank: sql`excluded.rank`,
            last_month_rank: sql`excluded.last_month_rank`,
            is_new_entry: sql`excluded.is_new_entry`,
            flags: sql`excluded.flags`,
          },
        });
    }

    inserted_count = entryValues.length;
  } catch (err: any) {
    return c.json({ error: String(err), stack: err.stack }, 500);
  }

  // 5. Invalidate KV cache — uses prefix scan so parameterized variants are caught
  await Promise.allSettled([
    invalidateCachePrefix(c.env.KV, CACHE_PREFIXES.momentum),
    invalidateCachePrefix(c.env.KV, CACHE_PREFIXES.streaks),
    invalidateCachePrefix(c.env.KV, CACHE_PREFIXES.charts),
  ]);

  // 6. Enrich new games with IGDB metadata — prefer Queue for durability
  if (newGameIds.length > 0) {
    await scheduleEnrichment(c.env, c.executionCtx, newGameIds);
  }

  return c.json({
    data: {
      report_id: reportId!,
      inserted_count,
      warnings,
    },
  });
});

app.post("/games/enrich", async (c) => {
  const db = c.get("db");

  const rows = await db
    .select({ id: games.id })
    .from(games)
    .leftJoin(game_details, eq(game_details.game_id, games.id))
    .where(isNull(game_details.game_id));

  if (rows.length === 0) {
    return c.json({
      data: { queued: 0, message: "All games already enriched" },
    });
  }

  const ids = rows.map((r) => r.id);
  await scheduleEnrichment(c.env, c.executionCtx, ids);

  return c.json({ data: { queued: ids.length } });
});

app.post("/games/:id", zValidator("json", UpdateGameSchema), async (c) => {
  const id = Number(c.req.param("id"));
  const update = c.req.valid("json");

  if (Object.keys(update).length === 0) {
    return c.json({ error: "No valid fields to update" }, 400);
  }

  const db = c.get("db");
  const rows = await db
    .update(games)
    .set(update)
    .where(eq(games.id, id))
    .returning();

  if (rows.length === 0) return c.json({ error: "Not found" }, 404);
  return c.json({ data: rows[0] });
});

export default app;
