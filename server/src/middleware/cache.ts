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
      try {
        return c.json(JSON.parse(cached));
      } catch {
        // Corrupted cache value — treat as miss and fall through
      }
    }

    await next();

    const body = await c.res.clone().text();
    if (c.res.status === 200) {
      await c.env.KV.put(cacheKey, body, { expirationTtl: ttlSeconds });
    }
  };
};

/**
 * Deletes all KV cache entries whose keys begin with `prefix`.
 * Handles pagination so large caches are fully invalidated.
 */
export async function invalidateCachePrefix(
  kv: KVNamespace,
  prefix: string,
): Promise<void> {
  let cursor: string | undefined;
  do {
    const result = await kv.list({
      prefix,
      limit: 1000,
      ...(cursor ? { cursor } : {}),
    });
    await Promise.allSettled(result.keys.map((k) => kv.delete(k.name)));
    cursor = result.list_complete
      ? undefined
      : (result as KVNamespaceListResult<unknown, string> & { cursor: string })
          .cursor;
  } while (cursor);
}
