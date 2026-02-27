import type { D1Database } from "@cloudflare/workers-types";

// Publishers table has been removed. Publisher-share analytics returns empty
// until a replacement data source is available.
export async function getPublisherShare(
  _d1: D1Database,
  _year: number,
  _chart_type: string,
): Promise<[]> {
  return [];
}
