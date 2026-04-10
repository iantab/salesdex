import { eq, sql } from "drizzle-orm";
import type { CloudflareBindings } from "../types/bindings";
import { createDb } from "../db/client";
import { games, game_details } from "../db/schema";
import { searchGame, getGameById } from "./igdb";

export async function enrichGames(
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
      if (!result) {
        await db
          .insert(game_details)
          .values({
            game_id: gameId,
            release_date_us: null,
            publisher: null,
            developer: null,
          })
          .onConflictDoNothing();
        continue;
      }

      await db
        .update(games)
        .set({
          igdb_id: result.igdb_id,
          cover_url: result.cover_url,
        })
        .where(eq(games.id, gameId));

      await db
        .insert(game_details)
        .values({
          game_id: gameId,
          release_date_us: result.release_date_us,
          publisher: result.publisher,
          developer: result.developer,
        })
        .onConflictDoUpdate({
          target: game_details.game_id,
          set: {
            release_date_us: result.release_date_us,
            publisher: result.publisher,
            developer: result.developer,
            updated_at: sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
          },
        });
    } catch (err) {
      console.error(
        `[enrichment] Failed for game ${gameId} ("${rows[0].title_en}"):`,
        err,
      );
    }
  }
}
