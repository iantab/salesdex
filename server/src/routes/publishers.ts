import { Hono } from "hono";
import type { CloudflareBindings } from "../types/bindings";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Publishers table has been removed. Route kept for API compatibility.
app.get("/", (c) => c.json({ data: [] }));

export default app;
