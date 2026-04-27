# CLAUDE.md

This file provides repository-local guidance for working in the Mockingbird-Web standalone repo.

## Project Overview

Mockingbird Knowledge Web is a standalone Next.js 16 content site for articles, prompts, and rankings.

- **Framework**: Next.js 16 App Router, React 19, TypeScript
- **Runtime**: Node.js (not Edge) -- `better-sqlite3`, `node-cron`, and local filesystem require Node runtime
- **Database**: SQLite via `better-sqlite3`, stored at `./data/knowledge.db`
- **Auth**: Session-based with HttpOnly cookies; roles: user / member / admin; invitation code system

The site carries 3 core content types:
- Articles: `/ai/articles/*`, `/finance/articles/*`
- Prompts: `/prompts/*`
- Rankings: `/rankings/*`

## Build & Run

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Production build
npm run build
```

Dev port is **5046** (configured in `package.json`).

## Test Commands

```bash
# Quality gates (run before every commit)
npm run lint
npm run test
npm run build

# Security guards (checks auth, sanitization, dangerous HTML)
scripts/check-knowledge-web-guards.sh

# SEO launch readiness (requires running server)
scripts/check-seo-launch-readiness.sh
```

## Key Paths

| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router pages and API routes |
| `app/api/` | Route handlers (all Node runtime) |
| `app/api/jobs/route.ts` | Scheduler management endpoint |
| `lib/db.ts` | SQLite connection and initialization |
| `lib/init-schema.ts` | Database schema bootstrap |
| `lib/jobs/scheduler.ts` | node-cron scheduler (PromptSync, RankingSync) |
| `lib/articles/` | Article source config and reading chain |
| `lib/services/` | Business logic services |
| `lib/cache/` | Unified cache layer |
| `lib/seo/` | SEO config, metadata, schema, internal links |
| `lib/pipelines/` | Prompt sync and media processing |
| `lib/utils/admin-auth.ts` | Admin token verification |
| `instrumentation.ts` | Node runtime startup hook (starts scheduler) |
| `next.config.ts` | Next.js configuration |
| `docs/` | Operations docs and observation logs |
| `tests/` | Test files |
| `agent.md` | Detailed agent guide for this project |

## Database

SQLite at `./data/knowledge.db` via `better-sqlite3`.

Core tables:
- `Prompts` -- prompt entries
- `SystemLogs` -- system log records

Articles are **not** stored in SQLite. They come from local content repositories configured via `ARTICLE_LOCAL_SOURCES`. See `lib/articles/source-config.ts` for the reading chain.

`lib/init-schema.ts` explicitly drops a legacy `Articles` table on startup -- do not reintroduce article storage without removing that cleanup first.

## Auth

- Admin API routes require token via `x-admin-token` header or `authorization: Bearer <token>`
- Token comes from `KNOWLEDGE_ADMIN_TOKEN` (preferred) or `ADMIN_API_TOKEN` (fallback)
- Unconfigured token returns `503`, missing token returns `401`, wrong token returns `403`
- User-facing auth uses session-based HttpOnly cookies with invitation code system

## Scheduler

The project has a real background scheduler (not a static site):
- `instrumentation.ts` calls `startScheduler()` when `NEXT_RUNTIME === 'nodejs'`
- PromptSync: syncs prompts from configured sources (default: every minute at :30)
- RankingSync: refreshes ranking caches (default: every 2 hours)

If caching, prompt imports, or ranking updates behave oddly, check `lib/jobs/scheduler.ts` and `app/api/jobs/route.ts` first.

## Runtime Facts

- All API routes using `better-sqlite3`, filesystem, or `node-cron` **must** stay on Node runtime
- Do not move DB-accessing logic to Edge runtime
- The site runs SEO metadata, robots, sitemap, and JSON-LD all derived from `SITE_URL`
- Index control via `SEO_CAN_INDEX` env var

## Critical Rules

1. **Port 5046**: Do not change the dev port
2. **No Edge runtime for DB routes**: Any route touching SQLite must use Node runtime
3. **Articles come from filesystem**: Do not add article data to SQLite
4. **SEO uses shared builders**: Do not write per-page metadata from scratch; reuse `lib/seo/`
5. **Admin routes require auth**: Never remove `verifyAdminHeaders` from management POST routes
6. **Env vars**: See `.env.example` for all configurable variables; never commit `.env.local`
7. **Validate before commit**: Always run `npm run lint && npm run test && npm run build`
