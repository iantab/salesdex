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
  cover_url: string | null;
  release_date_us: string | null;
  release_date_jp: string | null;
  developer: string | null;
  franchise: string | null;
  title_jp: string | null;
}

interface IGDBRawGame {
  id: number;
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
  "id,name,cover.url,first_release_date," +
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
    cover_url,
    release_date_us,
    release_date_jp,
    developer,
    franchise,
    title_jp,
  };
}

export async function searchGame(
  env: CloudflareBindings,
  title: string,
): Promise<IGDBResult | null> {
  const token = await getAccessToken(env);

  const cleanTitle = title.replace(/[®™©]/g, "").trim();

  const doExactSearch = async (searchTitle: string): Promise<IGDBRawGame[]> => {
    const sanitized = searchTitle.replace(/"/g, '\\"');
    const body = `fields ${IGDB_FIELDS};\nwhere name ~ "${sanitized}";\nlimit 1;`;

    const res = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body,
    });

    if (!res.ok)
      throw new Error(`IGDB exact search request failed: ${res.status}`);
    return res.json<IGDBRawGame[]>();
  };

  const doFuzzySearch = async (searchTitle: string): Promise<IGDBRawGame[]> => {
    const sanitized = searchTitle.replace(/"/g, "");
    const body = `fields ${IGDB_FIELDS};\nsearch "${sanitized}";\nlimit 1;`;

    const res = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body,
    });

    if (!res.ok)
      throw new Error(`IGDB fuzzy search request failed: ${res.status}`);
    return res.json<IGDBRawGame[]>();
  };

  // 1. Try an exact match first
  let results = await doExactSearch(cleanTitle);

  // 2. If no exact match, try a fuzzy text search
  if (results.length === 0) {
    results = await doFuzzySearch(cleanTitle);
  }

  // 3. Fallback: if there's a subtitle, search just the main title part
  if (
    results.length === 0 &&
    (cleanTitle.includes(" - ") || cleanTitle.includes(": "))
  ) {
    const shortTitle = cleanTitle.split(/ - |: /)[0].trim();
    results = await doExactSearch(shortTitle);

    if (results.length === 0) {
      results = await doFuzzySearch(shortTitle);
    }
  }

  if (results.length === 0) return null;
  return parseIGDBGame(results[0]);
}

export async function getGameById(
  env: CloudflareBindings,
  igdbId: number,
): Promise<IGDBResult | null> {
  const token = await getAccessToken(env);

  const body = `fields ${IGDB_FIELDS};\nwhere id = ${igdbId};\nlimit 1;`;

  const res = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
  });

  if (!res.ok) throw new Error(`IGDB request failed: ${res.status}`);

  const results = await res.json<IGDBRawGame[]>();
  if (!results || results.length === 0) return null;
  return parseIGDBGame(results[0]);
}
