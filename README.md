# Salesdex

A website for browsing video game sales rankings.

## Stack

| Client         | Server             |
| -------------- | ------------------ |
| React 19       | Hono               |
| Vite           | Cloudflare Workers |
| TanStack Query | D1 (SQLite) + KV   |
| Recharts       | Drizzle ORM        |
|                | Bun / Wrangler     |

## Prerequisites

- [Bun](https://bun.sh/) installed
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed and authenticated (`wrangler login`)
- A Cloudflare account
- Twitch credentials for [IGDB](https://www.igdb.com/api) access (game metadata enrichment)

## First-time setup

```bash
# 1. Copy the example Wrangler config
cp server/wrangler.example.jsonc server/wrangler.jsonc

# 2. Create the D1 database and KV namespace
wrangler d1 create game-sales-tracker
wrangler kv namespace create KV

# 3. Paste the returned database_id and KV id into server/wrangler.jsonc

# 4. Create local environment variables
# server/.dev.vars
TWITCH_CLIENT_ID=...
TWITCH_CLIENT_SECRET=...

# 5. Install dependencies
cd server && bun install
cd ../client && bun install
```

## Running locally

**Server** — http://localhost:8787

```bash
cd server && bun run dev
```

Auth middleware is skipped in local dev when the Cloudflare Access JWT header is absent, so all endpoints are accessible without credentials.

**Client** — http://localhost:5173 (proxies `/games`, `/circana`, `/admin` to 8787)

```bash
cd client && bun run dev
```

## Migrations

```bash
# Apply locally
cd server && bunx wrangler d1 migrations apply game-sales-tracker --local

# Apply to remote (production)
cd server && bunx wrangler d1 migrations apply game-sales-tracker
```

## API routes

### Public

| Method | Path                   | Description                                                   |
| ------ | ---------------------- | ------------------------------------------------------------- |
| GET    | `/games`               | List games (query: `search`, `page`, `pageSize`)              |
| GET    | `/games/:id`           | Get game by ID                                                |
| GET    | `/games/:id/igdb`      | Get IGDB metadata for a game                                  |
| GET    | `/games/:id/circana`   | Get all Circana entries for a game                            |
| GET    | `/circana/reports`     | List reports (query: `year`, `period_type`)                   |
| GET    | `/circana/reports/:id` | Get single report + market totals                             |
| GET    | `/circana/charts`      | Chart entries for a report (query: `report_id`, `chart_type`) |
| GET    | `/circana/trends`      | Rank history for a game (query: `game_id`, `from`, `to`)      |

### Admin (Cloudflare Access JWT required)

| Method | Path                    | Description                                      |
| ------ | ----------------------- | ------------------------------------------------ |
| POST   | `/admin/ingest/circana` | Ingest a Circana report                          |
| POST   | `/admin/games/:id`      | Update game data                                 |
| POST   | `/admin/games/enrich`   | Trigger IGDB enrichment for all unenriched games |

## Ingest payload schema

`POST /admin/ingest/circana` accepts JSON matching this shape:

```ts
{
  year: number,                         // e.g. 2024
  month: number | null,                 // 1–12, null for annual reports
  period_type: "monthly" | "annual",
  period_start: string,                 // "YYYY-MM-DD"
  period_end: string,                   // "YYYY-MM-DD"
  tracking_weeks?: number,
  market_totals?: {
    total_market_spend?: number,
    content_spend?: number,
    hardware_spend?: number,
    accessory_spend?: number,
    notes?: string
  },
  entries: Array<{
    chart_type: "overall" | "nintendo" | "playstation" | "xbox",
    rank: number,
    last_month_rank?: number | null,
    is_new_entry?: boolean,
    flags?: {
      no_nintendo_digital?: boolean,
      no_digital?: boolean,
      no_nintendo_xbox_digital?: boolean
    },
    game: { title_en: string }
  }>
}
```


## Deploying

**Server:**

```bash
cd server && bun run deploy
```

**Client:** deploys automatically via GitHub Actions to GitHub Pages on push to `master`.

## Other scripts

```bash
# Open Drizzle Studio (local DB browser)
cd server && bun run db:studio

# Regenerate Cloudflare Worker types
cd server && bun run cf-typegen

# Build / preview the client
cd client && bun run build
cd client && bun run preview
```
