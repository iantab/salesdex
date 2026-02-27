import { readdirSync } from "fs";
import { resolve, join } from "path";
import { spawnSync } from "child_process";

const d1Dir = resolve(".wrangler/state/v3/d1/miniflare-D1DatabaseObject");

try {
  const files = readdirSync(d1Dir);
  const sqliteFile = files.find((f) => f.endsWith(".sqlite"));

  if (!sqliteFile) {
    console.error(
      `No .sqlite file found in ${d1Dir}. Make sure you have run 'bun run dev' at least once.`,
    );
    process.exit(1);
  }

  const dbPath = join(d1Dir, sqliteFile);
  process.env.LOCAL_DB_PATH = dbPath;

  console.log(`Starting Drizzle Studio with local D1 database: \n${dbPath}\n`);

  // Cross-platform check since standard 'bunx' might need '.cmd' suffix on Windows if spawnSync doesn't resolve it automatically
  // For bun, 'bun x drizzle-kit studio' is safer cross-platform.
  spawnSync("bun", ["x", "drizzle-kit", "studio"], {
    stdio: "inherit",
    env: process.env,
  });
} catch (e: any) {
  console.error("Error finding local DB:", e.message);
  process.exit(1);
}
