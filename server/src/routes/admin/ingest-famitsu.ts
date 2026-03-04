import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, inArray, sql } from "drizzle-orm";
import type { CloudflareBindings, AppVariables } from "../../types/bindings";
import { invalidateCachePrefix, CACHE_PREFIXES } from "../../middleware/cache";
import { enrichGames } from "../../services/enrichment";
import {
  games,
  famitsu_reports,
  famitsu_software_entries,
  famitsu_hardware_entries,
} from "../../db/schema";

const app = new Hono<{
  Bindings: CloudflareBindings;
  Variables: AppVariables;
}>();

const SoftwareEntrySchema = z.object({
  rank: z.number().int().min(1).max(1000),
  platform: z.string().min(1).max(100),
  weekly_sales: z.number().int().nonnegative().nullable().optional(),
  lifetime_sales: z.number().int().nonnegative().nullable().optional(),
  is_new: z.boolean().optional(),
  release_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  game: z.object({
    title_en: z.string().min(1).max(500),
  }),
});

const HardwareEntrySchema = z.object({
  rank: z.number().int().min(1).max(100),
  platform: z.string().min(1).max(100),
  weekly_sales: z.number().int().nonnegative().nullable().optional(),
  lifetime_sales: z.number().int().nonnegative().nullable().optional(),
});

const IngestSchema = z.object({
  report_url: z.string().url().optional(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  week_of_year: z.number().int().min(1).max(53),
  scraped_at: z.string().optional(),
  software: z.array(SoftwareEntrySchema).min(1).max(200),
  hardware: z.array(HardwareEntrySchema).max(50),
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

app.post("/ingest/famitsu", zValidator("json", IngestSchema), async (c) => {
  const payload = c.req.valid("json");
  const db = c.get("db");

  const warnings: string[] = [];
  const newGameIds: number[] = [];
  let reportId: number;

  try {
    // 1. Derive year from period_start
    const year = parseInt(payload.period_start.slice(0, 4), 10);

    // 2. Upsert famitsu_reports — SELECT by (period_start, period_end), INSERT if missing
    const existingReport = await db
      .select({ id: famitsu_reports.id })
      .from(famitsu_reports)
      .where(eq(famitsu_reports.period_start, payload.period_start))
      .limit(1);

    if (existingReport.length > 0) {
      reportId = existingReport[0].id;
    } else {
      const inserted = await db
        .insert(famitsu_reports)
        .values({
          year,
          week_of_year: payload.week_of_year,
          period_start: payload.period_start,
          period_end: payload.period_end,
          report_url: payload.report_url ?? null,
          scraped_at: payload.scraped_at ?? null,
        })
        .returning({ id: famitsu_reports.id });
      reportId = inserted[0].id;
    }

    // 3. Batch-resolve games by title (software entries only)
    const uniqueTitles = [
      ...new Set(payload.software.map((e) => e.game.title_en)),
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

    // 4. Upsert famitsu_software_entries in chunks of 10 (8 params/row → 80/batch)
    const softwareValues = payload.software.map((entry) => ({
      report_id: reportId,
      game_id: titleToGameId.get(entry.game.title_en)!,
      rank: entry.rank,
      platform: entry.platform,
      weekly_sales: entry.weekly_sales ?? null,
      lifetime_sales: entry.lifetime_sales ?? null,
      is_new: entry.is_new ?? false,
      release_date: entry.release_date ?? null,
    }));

    const chunkSize = 10;
    for (let i = 0; i < softwareValues.length; i += chunkSize) {
      const chunk = softwareValues.slice(i, i + chunkSize);
      await db
        .insert(famitsu_software_entries)
        .values(chunk)
        .onConflictDoUpdate({
          target: [
            famitsu_software_entries.report_id,
            famitsu_software_entries.rank,
            famitsu_software_entries.platform,
          ],
          set: {
            game_id: sql`excluded.game_id`,
            weekly_sales: sql`excluded.weekly_sales`,
            lifetime_sales: sql`excluded.lifetime_sales`,
            is_new: sql`excluded.is_new`,
            release_date: sql`excluded.release_date`,
          },
        });
    }

    // 5. Upsert famitsu_hardware_entries in chunks of 10 (6 params/row → 60/batch)
    if (payload.hardware.length > 0) {
      const hardwareValues = payload.hardware.map((entry) => ({
        report_id: reportId,
        rank: entry.rank,
        platform: entry.platform,
        weekly_sales: entry.weekly_sales ?? null,
        lifetime_sales: entry.lifetime_sales ?? null,
      }));

      for (let i = 0; i < hardwareValues.length; i += chunkSize) {
        const chunk = hardwareValues.slice(i, i + chunkSize);
        await db
          .insert(famitsu_hardware_entries)
          .values(chunk)
          .onConflictDoUpdate({
            target: [
              famitsu_hardware_entries.report_id,
              famitsu_hardware_entries.rank,
            ],
            set: {
              platform: sql`excluded.platform`,
              weekly_sales: sql`excluded.weekly_sales`,
              lifetime_sales: sql`excluded.lifetime_sales`,
            },
          });
      }
    }
  } catch (err: any) {
    return c.json({ error: String(err), stack: err.stack }, 500);
  }

  // 6. Invalidate KV cache
  await Promise.allSettled([
    invalidateCachePrefix(c.env.KV, CACHE_PREFIXES.famitsuReports),
    invalidateCachePrefix(c.env.KV, CACHE_PREFIXES.famitsuSoftware),
  ]);

  // 7. Enrich new games with IGDB metadata
  if (newGameIds.length > 0) {
    await scheduleEnrichment(c.env, c.executionCtx, newGameIds);
  }

  return c.json({
    data: {
      report_id: reportId!,
      software_count: payload.software.length,
      hardware_count: payload.hardware.length,
      warnings,
    },
  });
});

export default app;
