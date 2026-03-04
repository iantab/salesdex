import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "hono/logger";
import type { CloudflareBindings, AppVariables } from "./types/bindings";
import { createDb } from "./db/client";
import { authMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { enrichGames } from "./services/enrichment";
import gamesRoutes from "./routes/games";
import circanaRoutes from "./routes/circana";
import famitsuRoutes from "./routes/famitsu";
import adminRoutes from "./routes/admin/ingest-circana";
import adminFamitsuRoutes from "./routes/admin/ingest-famitsu";

const app = new Hono<{
  Bindings: CloudflareBindings;
  Variables: AppVariables;
}>();

app.use("*", logger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    // TODO: replace "*" with your frontend origin(s) before going to production
    // e.g. origin: ["https://your-app.pages.dev"]
    origin: "*",
    allowMethods: ["GET", "POST"],
    allowHeaders: ["Content-Type"],
  }),
);
app.use("*", async (c, next) => {
  c.set("db", createDb(c.env.DB));
  await next();
});

// Rate limit all public routes (no-op if RATE_LIMITER binding is not configured)
app.use("/games/*", rateLimitMiddleware);
app.use("/circana/*", rateLimitMiddleware);
app.use("/famitsu/*", rateLimitMiddleware);

app.get("/", (c) => c.json({ status: "ok" }));

app.route("/games", gamesRoutes);
app.route("/circana", circanaRoutes);
app.route("/famitsu", famitsuRoutes);

// Admin routes — protected by rate limiting and auth middleware
// POST /admin/ingest/circana, POST /admin/ingest/famitsu, POST /admin/games/:id, POST /admin/games/enrich
app.use("/admin/*", rateLimitMiddleware);
app.use("/admin/*", authMiddleware);
app.route("/admin", adminRoutes);
app.route("/admin", adminFamitsuRoutes);

export default {
  fetch: app.fetch,

  /**
   * Cloudflare Queue consumer for async IGDB enrichment.
   * Requires "queues" binding in wrangler.jsonc — see README for setup.
   */
  async queue(
    batch: MessageBatch<{ game_ids: number[] }>,
    env: CloudflareBindings,
  ): Promise<void> {
    for (const msg of batch.messages) {
      try {
        await enrichGames(env, msg.body.game_ids);
        msg.ack();
      } catch {
        msg.retry();
      }
    }
  },
};
