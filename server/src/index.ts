import { Hono } from "hono";
import type { CloudflareBindings } from "./types/bindings";
import { authMiddleware } from "./middleware/auth";
import gamesRoutes from "./routes/games";
import circanaRoutes from "./routes/circana";
import publishersRoutes from "./routes/publishers";
import analyticsRoutes from "./routes/analytics";
import adminRoutes from "./routes/admin/ingest-circana";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/", (c) => c.json({ status: "ok" }));

app.route("/games", gamesRoutes);
app.route("/circana", circanaRoutes);
app.route("/publishers", publishersRoutes);
app.route("/analytics", analyticsRoutes);

// Admin routes — protected by auth middleware
// POST /admin/ingest/circana, POST /admin/games/:id, POST /admin/publishers, GET /admin/queue
app.use("/admin/*", authMiddleware);
app.route("/admin", adminRoutes);

export default app;
