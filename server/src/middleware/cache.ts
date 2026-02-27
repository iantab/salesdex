import type { MiddlewareHandler } from "hono";
import type { CloudflareBindings } from "../types/bindings";

export const kvCache = (
  ttlSeconds: number,
): MiddlewareHandler<{ Bindings: CloudflareBindings }> => {
  return async (c, next) => {
    const url = new URL(c.req.url);
    const sortedParams = [...url.searchParams.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    const cacheKey = `cache:${url.pathname}:${sortedParams}`;

    const cached = await c.env.KV.get(cacheKey);
    if (cached !== null) {
      return c.json(JSON.parse(cached));
    }

    await next();

    const body = await c.res.clone().text();
    if (c.res.status === 200) {
      await c.env.KV.put(cacheKey, body, { expirationTtl: ttlSeconds });
    }
  };
};
