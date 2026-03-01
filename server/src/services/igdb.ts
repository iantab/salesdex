import type { CloudflareBindings } from "../types/bindings";

const TOKEN_KEY = "igdb:access_token";

async function getAccessToken(env: CloudflareBindings): Promise<string> {
  const cached = await env.KV.get(TOKEN_KEY);
  if (cached) return cached;

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.TWITCH_CLIENT_ID,
      client_secret: env.TWITCH_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error(`Twitch token request failed: ${res.status}`);
  }

  const data = await res.json<{ access_token: string; expires_in: number }>();
  const ttl = Math.max(data.expires_in - 3600, 60);
  await env.KV.put(TOKEN_KEY, data.access_token, { expirationTtl: ttl });

  return data.access_token;
}

export interface IGDBResult {
  igdb_id: number;
  slug: string | null;
  cover_url: string | null;
  release_date_us: string | null;
  release_date_jp: string | null;
  developer: string | null;
  franchise: string | null;
  title_jp: string | null;
}

interface IGDBRawGame {
  id: number;
  name?: string;
  slug?: string;
  cover?: { url: string };
  first_release_date?: number;
  involved_companies?: Array<{
    company?: { name: string };
    developer?: boolean;
  }>;
  franchises?: Array<{ name: string }>;
  alternative_names?: Array<{
    name: string;
    comment?: string;
  }>;
  release_dates?: Array<{
    date?: number;
    region?: number;
  }>;
}

const IGDB_FIELDS =
  "id,name,slug,cover.url,first_release_date," +
  "involved_companies.company.name,involved_companies.developer," +
  "franchises.name," +
  "alternative_names.name,alternative_names.comment," +
  "release_dates.*";

function parseIGDBGame(game: IGDBRawGame): IGDBResult {
  let cover_url: string | null = null;
  if (game.cover?.url) {
    cover_url = game.cover.url
      .replace(/^\/\//, "https://")
      .replace("t_thumb", "t_cover_big");
  }

  // Prefer explicit NA region (2) release date, fall back to first_release_date
  const usRelease = game.release_dates?.find(
    (rd) => rd.region === 2 && rd.date != null,
  );
  let release_date_us: string | null = null;
  if (usRelease?.date != null) {
    release_date_us = new Date(usRelease.date * 1000)
      .toISOString()
      .slice(0, 10);
  } else if (game.first_release_date != null) {
    release_date_us = new Date(game.first_release_date * 1000)
      .toISOString()
      .slice(0, 10);
  }

  // Japan region (5); fall back to Worldwide (8) → copy US date
  let release_date_jp: string | null = null;
  const jpRelease = game.release_dates?.find(
    (rd) => rd.region === 5 && rd.date != null,
  );
  if (jpRelease?.date != null) {
    release_date_jp = new Date(jpRelease.date * 1000)
      .toISOString()
      .slice(0, 10);
  } else if (
    game.release_dates?.some((rd) => rd.region === 8 && rd.date != null) ||
    game.first_release_date != null
  ) {
    release_date_jp = release_date_us;
  }

  const devEntry = game.involved_companies?.find((ic) => ic.developer === true);
  const developer = devEntry?.company?.name ?? null;

  const franchise = game.franchises?.[0]?.name ?? null;

  const jpAlt = game.alternative_names?.find((an) =>
    an.comment?.toLowerCase().includes("japanese"),
  );
  const title_jp = jpAlt?.name ?? null;

  return {
    igdb_id: game.id,
    slug: game.slug ?? null,
    cover_url,
    release_date_us,
    release_date_jp,
    developer,
    franchise,
    title_jp,
  };
}

function similarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[/&+]/g, " ")
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;
  const bigrams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      m.set(bg, (m.get(bg) ?? 0) + 1);
    }
    return m;
  };
  const bA = bigrams(na);
  const bB = bigrams(nb);
  let intersection = 0;
  for (const [bg, count] of bA) {
    intersection += Math.min(count, bB.get(bg) ?? 0);
  }
  return (2 * intersection) / (na.length - 1 + (nb.length - 1));
}

async function igdbPost(
  env: CloudflareBindings,
  token: string,
  body: string,
): Promise<IGDBRawGame[]> {
  const res = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`IGDB request failed: ${res.status}`);
  return res.json<IGDBRawGame[]>();
}

const MIN_SIMILARITY = 0.5;

function pickBest(results: IGDBRawGame[], query: string): IGDBRawGame | null {
  const best = results.reduce((best, candidate) => {
    return similarity(candidate.name ?? "", query) >
      similarity(best.name ?? "", query)
      ? candidate
      : best;
  });
  return similarity(best.name ?? "", query) >= MIN_SIMILARITY ? best : null;
}

export async function searchGame(
  env: CloudflareBindings,
  title: string,
): Promise<IGDBResult | null> {
  const token = await getAccessToken(env);

  const cleanTitle = title.replace(/[®™©]/g, "").trim();
  // Sanitize separators for the IGDB query — /&+ break IGDB's query parser
  const searchTitle = cleanTitle
    .replace(/[/&+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const doExactSearch = (searchTitle: string): Promise<IGDBRawGame[]> => {
    const sanitized = searchTitle.replace(/"/g, '\\"');
    return igdbPost(
      env,
      token,
      `fields ${IGDB_FIELDS};\nwhere name ~ "${sanitized}";\nlimit 5;`,
    );
  };

  const doFuzzySearch = (searchTitle: string): Promise<IGDBRawGame[]> => {
    const sanitized = searchTitle.replace(/"/g, "");
    return igdbPost(
      env,
      token,
      `fields ${IGDB_FIELDS};\nsearch "${sanitized}";\nlimit 5;`,
    );
  };

  // 1. Try an exact match first
  let results = await doExactSearch(searchTitle);
  const query = cleanTitle;

  // 2. If no exact match, try a fuzzy text search
  if (results.length === 0) {
    results = await doFuzzySearch(searchTitle);
  }

  // 3. Fallback: if there's a subtitle, search just the main title part
  if (
    results.length === 0 &&
    (searchTitle.includes(" - ") || searchTitle.includes(": "))
  ) {
    const shortTitle = searchTitle.split(/ - |: /)[0].trim();
    results = await doExactSearch(shortTitle);

    if (results.length === 0) {
      results = await doFuzzySearch(shortTitle);
    }
  }

  if (results.length === 0) return null;
  const best = pickBest(results, query);
  if (!best) return null;
  return parseIGDBGame(best);
}

export async function getGameById(
  env: CloudflareBindings,
  igdbId: number,
): Promise<IGDBResult | null> {
  const token = await getAccessToken(env);
  const results = await igdbPost(
    env,
    token,
    `fields ${IGDB_FIELDS};\nwhere id = ${igdbId};\nlimit 1;`,
  );
  if (!results || results.length === 0) return null;
  return parseIGDBGame(results[0]);
}
