import type { MiddlewareHandler } from "hono";
import type { CloudflareBindings } from "../types/bindings";

/**
 * Rate limiting middleware using the Cloudflare Workers Rate Limiting API.
 *
 * Requires a `rate_limiting` binding named "RATE_LIMITER" in wrangler.jsonc:
 *
 *   "rate_limiting": [
 *     {
 *       "binding": "RATE_LIMITER",
 *       "namespace_id": "1",
 *       "simple": { "limit": 100, "period": 60 }
 *     }
 *   ]
 *
 * If the binding is absent (e.g. local dev without config), the middleware
 * is a no-op so nothing breaks.
 */
export const rateLimitMiddleware: MiddlewareHandler<{
  Bindings: CloudflareBindings;
}> = async (c, next) => {
  if (!c.env.RATE_LIMITER) return next();

  const ip =
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For") ??
    "unknown";

  const { success } = await c.env.RATE_LIMITER.limit({ key: ip });
  if (!success) {
    return c.json({ error: "Too Many Requests" }, 429);
  }

  return next();
};
