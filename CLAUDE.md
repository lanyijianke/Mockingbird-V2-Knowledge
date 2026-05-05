# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mockingbird Knowledge Web (知更鸟知识库) — a Next.js knowledge platform featuring AI articles, prompt galleries, trend rankings, and a membership system. Chinese-language, editorial magazine-style design.

## Commands

```bash
npm run dev          # Dev server on port 5046
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run all Vitest tests
npm run test:watch   # Vitest in watch mode
npm test -- tests/unit/auth-routes.test.ts  # Single test file
npm run invite:generate  # Generate membership invite codes
```

## Architecture

**Stack:** Next.js 16 App Router + React 19 + TypeScript + mysql2 + Vitest

### Two main directories
- `app/` — Next.js App Router pages, layouts, route handlers, and API endpoints
- `lib/` — Shared business logic, services, utilities, and configuration

### Key `lib/` modules
| Directory | Purpose |
|-----------|---------|
| `lib/auth/` | Session management, role hierarchy, route protection |
| `lib/services/` | Business logic for prompts, articles, rankings, logs |
| `lib/articles/` | Article directory service (local markdown files, not DB) |
| `lib/seo/` | Metadata builders, JSON-LD schemas, sitemap config |
| `lib/email/` | Resend email templates (verification, password reset) |
| `lib/jobs/` | Cron scheduler (prompt sync every 60s, rankings every 2h) |
| `lib/cache/` | In-memory cache with TTL, namespace isolation, tag invalidation |
| `lib/pipelines/` | Content sync from GitHub repos via adapters |
| `lib/security/` | CSP headers |

### Database
- **MySQL** via mysql2/promise connection pool at `mockingbird_knowledge` (configurable via `MYSQL_URL`)
- Schema auto-initialized in `lib/init-schema.ts` — tables: Users, Sessions, OauthAccounts, Prompts, SystemLogs, InvitationCodes, InvitationRedemptions
- Tests require `MYSQL_URL` env var pointing to a MySQL instance with CREATE DATABASE permission

### Role hierarchy (ascending)
`user` → `junior_member` (30d) → `senior_member` (365d) → `founder_member` (lifetime) → `admin`

### Authentication
- Email/password + OAuth (GitHub, Google)
- Session-based with HTTP-only cookies (nanoid tokens, 30-day TTL)
- Route protection via `middleware.ts` — `/profile`, `/membership` require auth

### Content sources
- **Articles:** Local markdown directories with frontmatter, multi-site support (`ai`, `finance`), served via manifest-based indexing
- **Prompts:** Synced from GitHub repos into MySQL, configured in `content-sources/prompts/*.json`
- **Rankings:** Scraped from GitHub Trending, ProductHunt, Skills.sh, cached 2 hours

### API routes (`app/api/`)
- `auth/*` — register, login, logout, me, verify-email, forgot/reset-password, oauth
- `articles`, `prompts`, `rankings` — content endpoints
- `article-assets/[site]/[slug]/[...assetPath]` — article media
- `jobs` — admin job scheduler control (requires `KNOWLEDGE_ADMIN_TOKEN`)
- `membership/redeem` — invite code redemption
- `health` — health check

## CSS Architecture

CSS 按功能模块隔离，每个功能的样式只在自己的路由树下加载，防止类名冲突。

**文件结构：**
- `app/globals.css`（~230 行）— 全站基础：tokens、reset、glass、footer、scrollbar、动画、toast。**禁止往这里加功能样式。**
- `app/_styles/` — 跨路由共享的功能 CSS，通过 layout 导入
- 各功能目录就近存放自己的 CSS（academy、articles/[slug]、ai/prompts/[id]）

**导入规则：**
- 功能 CSS 只在对应 layout 或 page 中导入，确保其他路由不会加载
- 新增页面样式时，创建独立 CSS 文件并在该页面的 layout/page 中 import
- **永远不要**把页面专属样式放进 globals.css

**已知教训：** 之前学社的 `.article-reader { display: none }` 放在 globals.css 里，把新文章阅读器也隐藏了。现在通过文件隔离彻底杜绝此类问题。

## Conventions

- All API routes use `export const runtime = 'nodejs'` for MySQL access
- **4-space** indentation in `lib/` and route handlers; **2-space** in React components — match surrounding file style
- Reuse centralized config (`lib/site-config.ts`, `lib/seo/config.ts`) for brand names, URLs, callbacks
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- Tests go in `tests/unit/`; use `MYSQL_URL` env var with CREATE DATABASE permission
- Never commit secrets — use `.env.local` (see `.env.example`)
