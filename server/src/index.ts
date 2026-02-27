import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "hono/logger";
import type { CloudflareBindings } from "./types/bindings";
import { authMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { enrichGames } from "./routes/admin/ingest-circana";
import gamesRoutes from "./routes/games";
import circanaRoutes from "./routes/circana";
import publishersRoutes from "./routes/publishers";
import analyticsRoutes from "./routes/analytics";
import adminRoutes from "./routes/admin/ingest-circana";

const app = new Hono<{ Bindings: CloudflareBindings }>();

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

// Rate limit all public routes (no-op if RATE_LIMITER binding is not configured)
app.use("/games/*", rateLimitMiddleware);
app.use("/circana/*", rateLimitMiddleware);
app.use("/analytics/*", rateLimitMiddleware);
app.use("/publishers/*", rateLimitMiddleware);

app.get("/", (c) => c.json({ status: "ok" }));

app.route("/games", gamesRoutes);
app.route("/circana", circanaRoutes);
app.route("/publishers", publishersRoutes);
app.route("/analytics", analyticsRoutes);

// Admin routes — protected by auth middleware
// POST /admin/ingest/circana, POST /admin/games/:id, POST /admin/games/enrich, GET /admin/queue
app.use("/admin/*", authMiddleware);
app.route("/admin", adminRoutes);

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
