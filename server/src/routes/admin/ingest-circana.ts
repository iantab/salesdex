import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, isNull, or } from "drizzle-orm";
import type { CloudflareBindings } from "../../types/bindings";
import { createDb } from "../../db/client";
import {
  games,
  circana_reports,
  circana_market_totals,
  circana_entries,
} from "../../db/schema";
import { searchGame, getGameById } from "../../services/igdb";

const app = new Hono<{ Bindings: CloudflareBindings }>();

const EntrySchema = z.object({
  chart_type: z.enum(["overall", "nintendo", "playstation", "xbox"]),
  rank: z.number().int(),
  last_month_rank: z.number().int().nullable().optional(),
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
    title_en: z.string(),
  }),
});

const IngestSchema = z.object({
  year: z.number().int(),
  month: z.number().int().nullable().optional(),
  period_type: z.enum(["monthly", "annual"]),
  period_start: z.string(),
  period_end: z.string(),
  tracking_weeks: z.number().int().optional(),
  market_totals: z
    .object({
      total_market_spend: z.number().optional(),
      content_spend: z.number().optional(),
      hardware_spend: z.number().optional(),
      accessory_spend: z.number().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  entries: z.array(EntrySchema),
});

async function enrichGames(
  env: CloudflareBindings,
  gameIds: number[],
): Promise<void> {
  const db = createDb(env.DB);
  for (const gameId of gameIds) {
    const rows = await db
      .select({ title_en: games.title_en, igdb_id: games.igdb_id })
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);
    if (rows.length === 0) continue;

    try {
      const row = rows[0];
      const result =
        row.igdb_id != null
          ? await getGameById(env, row.igdb_id)
          : await searchGame(env, row.title_en);
      if (!result) continue;

      const updateSet: Partial<typeof games.$inferInsert> = {
        igdb_id: result.igdb_id,
        cover_url: result.cover_url,
        release_date_us: result.release_date_us,
      };

      await db.update(games).set(updateSet).where(eq(games.id, gameId));
    } catch {
      // Non-fatal: skip this game if IGDB lookup fails
    }
  }
}

app.post("/ingest/circana", zValidator("json", IngestSchema), async (c) => {
  const payload = c.req.valid("json");
  const db = createDb(c.env.DB);

  // 1. Upsert report
  const existingReport = await db
    .select()
    .from(circana_reports)
    .where(
      and(
        eq(circana_reports.year, payload.year),
        payload.month != null
          ? eq(circana_reports.month, payload.month)
          : eq(circana_reports.period_type, payload.period_type),
        eq(circana_reports.period_type, payload.period_type),
      ),
    )
    .limit(1);

  let reportId: number;
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

  // 3. Resolve publishers and games, insert entries
  const warnings: string[] = [];
  let inserted_count = 0;
  const newGameIds: number[] = [];

  for (const entry of payload.entries) {
    // Resolve or create game
    let gameId: number;
    const existingGame = await db
      .select()
      .from(games)
      .where(eq(games.title_en, entry.game.title_en))
      .limit(1);

    if (existingGame.length > 0) {
      gameId = existingGame[0].id;
    } else {
      const newGame = await db
        .insert(games)
        .values({
          title_en: entry.game.title_en,
        })
        .returning({ id: games.id });
      gameId = newGame[0].id;
      newGameIds.push(gameId);
    }

    // Insert circana entry
    await db.insert(circana_entries).values({
      report_id: reportId,
      game_id: gameId,
      chart_type: entry.chart_type,
      rank: entry.rank,
      last_month_rank: entry.last_month_rank ?? null,
      is_new_entry: entry.is_new_entry ?? false,
      flags: entry.flags ? JSON.stringify(entry.flags) : null,
    });

    inserted_count++;
  }

  // 4. Invalidate KV cache keys for analytics routes
  await Promise.allSettled([
    c.env.KV.delete("cache:/analytics/publisher-share:"),
    c.env.KV.delete("cache:/analytics/momentum:"),
    c.env.KV.delete("cache:/analytics/streaks:"),
  ]);

  // 5. Enrich newly created games with IGDB metadata in the background
  if (newGameIds.length > 0) {
    c.executionCtx.waitUntil(enrichGames(c.env, newGameIds));
  }

  return c.json({
    data: {
      report_id: reportId,
      inserted_count,
      warnings,
    },
  });
});

app.get("/games/enrich", async (c) => {
  const db = createDb(c.env.DB);

  const rows = await db
    .select({ id: games.id })
    .from(games)
    .where(isNull(games.igdb_id));

  if (rows.length === 0) {
    return c.json({
      data: { queued: 0, message: "All games already enriched" },
    });
  }

  const ids = rows.map((r) => r.id);
  c.executionCtx.waitUntil(enrichGames(c.env, ids));

  return c.json({ data: { queued: ids.length } });
});

app.post("/games/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = createDb(c.env.DB);
  const body = await c.req.json<Partial<typeof games.$inferInsert>>();

  // Only allow safe metadata fields
  const { title_en, igdb_id, release_date_us, cover_url } = body;
  const update: Partial<typeof games.$inferInsert> = {};
  if (title_en !== undefined) update.title_en = title_en;
  if (igdb_id !== undefined) update.igdb_id = igdb_id;
  if (release_date_us !== undefined) update.release_date_us = release_date_us;
  if (cover_url !== undefined) update.cover_url = cover_url;

  if (Object.keys(update).length === 0) {
    return c.json({ error: "No valid fields to update" }, 400);
  }

  const rows = await db
    .update(games)
    .set(update)
    .where(eq(games.id, id))
    .returning();
  if (rows.length === 0) return c.json({ error: "Not found" }, 404);
  return c.json({ data: rows[0] });
});

export default app;
