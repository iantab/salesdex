import type { MiddlewareHandler } from "hono";
import type { CloudflareBindings } from "../types/bindings";

export const authMiddleware: MiddlewareHandler<{
  Bindings: CloudflareBindings;
}> = async (c, next) => {
  if (c.env.DEV_MODE === "true") return next();

  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  if (!token || token !== c.env.ADMIN_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return next();
};
