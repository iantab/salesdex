import type { createDb } from "../db/client";

export type AppVariables = { db: ReturnType<typeof createDb> };

export interface CloudflareBindings {
  DB: D1Database;
  KV: KVNamespace;
  TWITCH_CLIENT_ID: string;
  TWITCH_CLIENT_SECRET: string;
  // Secret token for admin routes — set via: wrangler secret put ADMIN_SECRET
  ADMIN_SECRET: string;
  // Set to "true" in .dev.vars only — skips auth in local dev
  DEV_MODE?: string;
  // Cloudflare Rate Limiting API (optional — add rate_limiting binding in wrangler.jsonc)
  RATE_LIMITER?: RateLimit;
}
