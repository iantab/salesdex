import type { MiddlewareHandler } from "hono";
import type { CloudflareBindings } from "../types/bindings";

export const authMiddleware: MiddlewareHandler<{
  Bindings: CloudflareBindings;
}> = async (c, next) => {
  const jwtAssertion = c.req.header("Cf-Access-Jwt-Assertion");

  // In local dev (no CF_PAGES env var), skip auth if no header present
  const isLocalDev = typeof (c.env as any).CF_PAGES === "undefined";
  if (isLocalDev && !jwtAssertion) {
    return next();
  }

  if (!jwtAssertion) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return next();
};
