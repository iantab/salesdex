import { Hono } from "hono";
import type { CloudflareBindings } from "../types/bindings";
import { createDb } from "../db/client";
import { publishers } from "../db/schema";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const rows = await db
    .select()
    .from(publishers)
    .orderBy(publishers.display_name);
  return c.json({ data: rows });
});

export default app;
