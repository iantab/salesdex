# game-sales-tracker

A REST API for Circana game sales data, backed by Cloudflare Workers, D1 (SQLite), and KV.

## Stack

- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **Framework**: [Hono](https://hono.dev/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) with D1
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **Package manager**: [Bun](https://bun.sh/)
- **CLI**: [Wrangler](https://developers.cloudflare.com/workers/wrangler/)

## Prerequisites

- [Bun](https://bun.sh/) installed
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed and authenticated (`wrangler login`)
- A Cloudflare account

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
```

> **Note:** `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` are Twitch credentials used for [IGDB](https://www.igdb.com/api) API access (game metadata enrichment).

## Running locally

```bash
cd server && bun run dev
```

The API will be available at http://localhost:8787.

Auth middleware is skipped in local dev when the Cloudflare Access JWT header is absent, so all endpoints are accessible without credentials.

## Migrations

```bash
# Apply locally
cd server && bunx wrangler d1 migrations apply game-sales-tracker --local

# Apply to remote (production)
cd server && bunx wrangler d1 migrations apply game-sales-tracker
```

## API routes

### Public

| Method | Path                         | Description                       |
| ------ | ---------------------------- | --------------------------------- |
| GET    | `/games`                     | List games                        |
| GET    | `/games/:id`                 | Get game by ID                    |
| GET    | `/games/:id/circana`         | Get Circana sales data for a game |
| GET    | `/circana/reports`           | List Circana reports              |
| GET    | `/circana/charts`            | Chart data                        |
| GET    | `/circana/trends`            | Trend data                        |
| GET    | `/publishers`                | List publishers                   |
| GET    | `/analytics/publisher-share` | Publisher market share            |
| GET    | `/analytics/momentum`        | Game momentum scores              |
| GET    | `/analytics/streaks`         | Sales streak data                 |

### Admin (Cloudflare Access JWT required)

| Method | Path                    | Description             |
| ------ | ----------------------- | ----------------------- |
| POST   | `/admin/ingest/circana` | Ingest a Circana report |
| POST   | `/admin/games/:id`      | Update game data        |
| GET    | `/admin/games/enrich`   | Enrich games via IGDB   |

## Deploying

```bash
cd server && bun run deploy
```

## Other scripts

```bash
# Open Drizzle Studio (local DB browser)
cd server && bun run db:studio

# Regenerate Cloudflare Worker types
cd server && bun run cf-typegen
```
