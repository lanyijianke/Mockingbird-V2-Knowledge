# Frontend Taxonomy Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt the knowledge site frontend to consume structured Domain/CategoryPath/KeywordsJson fields from IntelligenceTagging instead of the flat Tags comma-string.

**Architecture:** Prerequisite: the backend taxonomy restructuring (Mockingbird_V2 plan) must be deployed first so the database has `Domain`, `CategoryPath`, and `KeywordsJson` columns populated. This plan then updates each API route to read those columns, each page component to render breadcrumb-style taxonomy, and CSS to color by Domain. A compatibility layer (`tags` derived from structured fields) keeps things working during transition.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, mysql2

---

## File Structure

- Modify: `app/api/academy/quicknews/route.ts` — Read Domain/CategoryPath/KeywordsJson from IntelligenceTaggings
- Modify: `app/api/academy/articles/route.ts` — Same, plus structured WHERE filter
- Modify: `app/api/academy/narratives/route.ts` — Add Domain/CategoryPath to narrative query
- Modify: `app/api/academy/reports/route.ts` — Use Domain from report tagging
- Modify: `app/academy/quicknews/page.tsx` — Breadcrumb taxonomy display, dynamic domain filter, remove inferCategory/categoryFromTags
- Modify: `app/academy/articles/page.tsx` — Breadcrumb taxonomy display, dynamic domain filter, replace tagStyle
- Modify: `app/academy/narratives/page.tsx` — Breadcrumb taxonomy display, dynamic domain filter
- Modify: `app/academy/reports/page.tsx` — Dynamic domain filter, breadcrumb badge
- Modify: `app/intel/page.tsx` — Breadcrumb taxonomy in news cards and narrative panel
- Modify: `app/academy/academy.css` — Add --cat-global CSS vars
- Modify: `app/academy/quicknews/quicknews.css` — Add breadcrumb and domain-keyword styles
- Modify: `app/academy/articles/articles.css` — Add breadcrumb styles, update tag colors
- Modify: `app/academy/narratives/narratives.css` — Add breadcrumb styles, update narr-cat
- Modify: `app/academy/reports/reports.css` — Add breadcrumb styles, update rpt-cat
- Modify: `app/_styles/intel-main.css` — Add breadcrumb styles, update intel-cat to domain colors

## Prerequisite Check

Before starting any task, verify the backend has been deployed:

```bash
# Run a quick check — this should return structured fields
# (adjust connection details per your .env.local)
mysql -e "SELECT Domain, CategoryPath, KeywordsJson FROM IntelligenceTaggings LIMIT 3" mockingbird_knowledge
```

If these columns are empty or missing, the backend plan must be completed first.

---

## Task 1: Add Domain Color CSS Variables

**Files:**
- Modify: `app/academy/academy.css`
- Modify: `app/academy/quicknews/quicknews.css`
- Modify: `app/academy/articles/articles.css`
- Modify: `app/academy/narratives/narratives.css`
- Modify: `app/academy/reports/reports.css`
- Modify: `app/_styles/intel-main.css`

- [ ] **Step 1: Add --cat-global CSS variables to academy.css**

In `app/academy/academy.css`, after the existing `--cat-finance-border` line (line 20), add:

```css
  --cat-global: #fbbf24;
  --cat-global-bg: rgba(251, 191, 36, 0.10);
  --cat-global-border: rgba(251, 191, 36, 0.18);
```

- [ ] **Step 2: Add taxonomy breadcrumb CSS to quicknews.css**

Append to `app/academy/quicknews/quicknews.css`:

```css
/* ─── Taxonomy Breadcrumb ─── */
.feed-taxonomy { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
.feed-domain-badge {
  font-size: 0.58rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.05em; padding: 0.1rem 0.4rem; border-radius: 3px;
}
.feed-domain-badge.ai { color: var(--cat-ai); background: var(--cat-ai-bg); border: 1px solid var(--cat-ai-border); }
.feed-domain-badge.finance { color: var(--cat-finance); background: var(--cat-finance-bg); border: 1px solid var(--cat-finance-border); }
.feed-domain-badge.global { color: var(--cat-global); background: var(--cat-global-bg); border: 1px solid var(--cat-global-border); }
.feed-taxonomy-sep { font-size: 0.55rem; color: rgba(255,255,255,0.15); }
.feed-subcat-badge {
  font-size: 0.56rem; padding: 0.08rem 0.35rem; border-radius: 3px;
}
.feed-subcat-badge.ai { color: rgba(110,207,219,0.7); background: rgba(110,207,219,0.06); }
.feed-subcat-badge.finance { color: rgba(212,184,122,0.7); background: rgba(212,184,122,0.06); }
.feed-subcat-badge.global { color: rgba(251,191,36,0.7); background: rgba(251,191,36,0.06); }
.feed-taxonomy-divider { color: rgba(255,255,255,0.08); margin: 0 2px; }
.feed-kw-chip { font-size: 0.56rem; padding: 0.06rem 0.3rem; border-radius: 2px; background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.3); }

/* ─── Sub-category Filter ─── */
.filter-sub { display: flex; gap: 0.35rem; padding-left: 0.5rem; border-left: 2px solid rgba(232,213,183,0.1); margin-top: 0.3rem; flex-wrap: wrap; }
.filter-sub-btn {
  font-size: 0.68rem; padding: 0.2rem 0.6rem; border-radius: 12px;
  background: transparent; border: 1px solid rgba(232,213,183,0.08);
  color: rgba(232,213,183,0.4); cursor: pointer; transition: all 0.2s;
}
.filter-sub-btn:hover { border-color: rgba(232,213,183,0.2); color: rgba(232,213,183,0.6); }
.filter-sub-btn.active { background: rgba(232,213,183,0.08); border-color: rgba(232,213,183,0.2); color: var(--academy-gold); }
```

- [ ] **Step 3: Add taxonomy breadcrumb CSS to articles.css**

In `app/academy/articles/articles.css`, replace the `.article-card-tag` block (lines 55-59) with:

```css
.article-card-tags { display: flex; gap: 0.35rem; flex-wrap: wrap; align-items: center; }
.article-card-tag { font-size: 0.65rem; padding: 0.15rem 0.5rem; border-radius: 3px; font-weight: 600; }
.article-card-tag.ai { background: var(--cat-ai-bg); color: var(--cat-ai); border: 1px solid var(--cat-ai-border); }
.article-card-tag.finance { background: var(--cat-finance-bg); color: var(--cat-finance); border: 1px solid var(--cat-finance-border); }
.article-card-tag.global { background: var(--cat-global-bg); color: var(--cat-global); border: 1px solid var(--cat-global-border); }
.article-card-tag.other { background: rgba(156,163,175,0.08); color: #9ca3af; }
.article-taxonomy-sep { font-size: 0.55rem; color: rgba(255,255,255,0.15); }
.article-kw-chip { font-size: 0.6rem; padding: 0.1rem 0.35rem; border-radius: 2px; background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.3); }
```

- [ ] **Step 4: Add taxonomy breadcrumb CSS to narratives.css**

In `app/academy/narratives/narratives.css`, after the `.narr-cat.finance` line (line 69), add:

```css
.narr-cat.global { color: var(--cat-global); background: var(--cat-global-bg); border: 1px solid var(--cat-global-border); }
```

Append at the end of file:

```css
/* ─── Taxonomy Breadcrumb ─── */
.narr-taxonomy { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
.narr-taxonomy-sep { font-size: 0.5rem; color: rgba(255,255,255,0.15); }
.narr-subcat { font-size: 0.52rem; padding: 0.06rem 0.3rem; border-radius: 2px; }
.narr-subcat.ai { color: rgba(110,207,219,0.6); background: rgba(110,207,219,0.06); }
.narr-subcat.finance { color: rgba(212,184,122,0.6); background: rgba(212,184,122,0.06); }
.narr-subcat.global { color: rgba(251,191,36,0.6); background: rgba(251,191,36,0.06); }
```

- [ ] **Step 5: Add taxonomy breadcrumb CSS to reports.css**

In `app/academy/reports/reports.css`, after the `.rpt-cat.finance` line (line 40), add:

```css
.rpt-cat.global { color: var(--cat-global); background: var(--cat-global-bg); border: 1px solid var(--cat-global-border); }
```

- [ ] **Step 6: Update intel-main.css domain colors**

In `app/_styles/intel-main.css`, replace the `.intel-cat--ai` through `.intel-cat--default` block (lines 482-488) with:

```css
.intel-cat--ai { color: var(--cat-ai); background: var(--cat-ai-bg); }
.intel-cat--finance { color: var(--cat-finance); background: var(--cat-finance-bg); }
.intel-cat--global { color: var(--cat-global); background: var(--cat-global-bg); }
.intel-cat--default { color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.04); }
```

Append after the existing intel styles:

```css
/* ─── Taxonomy Breadcrumb (Intel) ─── */
.intel-taxonomy { display: flex; gap: 3px; align-items: center; flex-wrap: wrap; }
.intel-taxonomy-sep { font-size: 0.45rem; color: rgba(255,255,255,0.15); }
.intel-subcat { font-family: var(--font-mono); font-size: 0.48rem; padding: 0px 3px; border-radius: 1px; }
.intel-subcat.ai { color: rgba(110,207,219,0.6); background: rgba(110,207,219,0.05); }
.intel-subcat.finance { color: rgba(212,184,122,0.6); background: rgba(212,184,122,0.05); }
.intel-subcat.global { color: rgba(251,191,36,0.6); background: rgba(251,191,36,0.05); }
.intel-kw-chip { font-family: var(--font-mono); font-size: 0.45rem; color: rgba(255,255,255,0.25); padding: 0px 3px; background: rgba(255,255,255,0.02); border-radius: 1px; }
```

- [ ] **Step 7: Commit**

```bash
git add app/academy/academy.css app/academy/quicknews/quicknews.css app/academy/articles/articles.css app/academy/narratives/narratives.css app/academy/reports/reports.css app/_styles/intel-main.css
git commit -m "feat: add taxonomy breadcrumb CSS and domain color variables"
```

---

## Task 2: Update Quicknews API Route

**Files:**
- Modify: `app/api/academy/quicknews/route.ts`

- [ ] **Step 1: Update SQL query and response mapping**

Replace the entire content of `app/api/academy/quicknews/route.ts` with:

```typescript
import { NextResponse } from 'next/server';
import { query } from '@/lib/db-console';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const items = await query<{
            Id: number; Title: string; Source: string; ContentType: string;
            Content: string; CrawlTime: string; IngestedAt: string;
            Url: string; Images: string;
            AiSummary: string; AiReasoning: string; QualityScore: number;
            Domain: string; CategoryPath: string; KeywordsJson: string;
        }>(
            `SELECT i.Id, i.Title, i.Source, i.ContentType, i.Content,
                    i.CrawlTime, i.IngestedAt, i.Url, i.Images,
                    t.AiSummary, t.AiReasoning, t.QualityScore,
                    COALESCE(t.Domain, '') as Domain,
                    COALESCE(t.CategoryPath, '') as CategoryPath,
                    COALESCE(t.KeywordsJson, '[]') as KeywordsJson
             FROM IntelligenceItems i
             LEFT JOIN IntelligenceTaggings t ON t.ItemId = i.Id
             WHERE i.LifecycleStatus = 0
               AND i.ContentType IN ('Article', 'Feed', 'Discovery')
             ORDER BY i.IngestedAt DESC
             LIMIT 50`
        );

        const data = items.map(item => {
            let images: string[] = [];
            try {
                const parsed = typeof item.Images === 'string' ? JSON.parse(item.Images) : item.Images;
                if (Array.isArray(parsed)) images = parsed.filter((u: string) => typeof u === 'string');
            } catch { /* ignore */ }

            let keywords: string[] = [];
            try {
                keywords = JSON.parse(item.KeywordsJson || '[]');
            } catch { /* ignore */ }

            // Derive legacy tags for backward compatibility
            const pathParts = item.CategoryPath.split('/').filter(Boolean);
            const tags = [...new Set([...pathParts, ...keywords])];

            return {
                id: item.Id,
                title: item.Title || '',
                source: item.Source || '',
                summary: item.AiSummary || (item.Content || '').slice(0, 150),
                qualityScore: item.QualityScore ? Number(item.QualityScore) : null,
                crawlTime: item.CrawlTime,
                ingestedAt: item.IngestedAt,
                contentType: item.ContentType,
                aiReasoning: item.AiReasoning || '',
                domain: item.Domain.toLowerCase(),
                categoryPath: item.CategoryPath,
                keywords,
                tags,
                url: item.Url || '',
                images,
            };
        });

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('[API /academy/quicknews] Error:', err);
        return NextResponse.json({ success: false, error: '获取信息流失败' }, { status: 500 });
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/academy/quicknews/route.ts
git commit -m "feat: quicknews API reads structured taxonomy fields"
```

---

## Task 3: Update Articles API Route

**Files:**
- Modify: `app/api/academy/articles/route.ts`

- [ ] **Step 1: Update SQL query, filter logic, and response mapping**

Replace the entire content of `app/api/academy/articles/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-console';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const domain = searchParams.get('domain') || '';
        const category = searchParams.get('category') || '';
        const search = searchParams.get('search') || '';
        const source = searchParams.get('source') || '';
        const minScore = parseInt(searchParams.get('minScore') || '0', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '15', 10), 50);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        const conditions = ['i.LifecycleStatus = 0', "i.ContentType = 'Article'"];
        const params: (string | number)[] = [];

        // Legacy 'category' param compatibility: map Web3 → Finance/Web3
        if (category) {
            const normalized = category.toLowerCase() === 'web3' ? 'Finance/Web3' : category;
            conditions.push('(t.Domain = ? OR t.CategoryPath = ? OR t.CategoryPath LIKE ?)');
            params.push(normalized, normalized, normalized + '/%');
        }

        if (domain) {
            conditions.push('(t.Domain = ? OR t.CategoryPath LIKE ?)');
            params.push(domain, domain + '/%');
        }

        if (search) {
            conditions.push('(i.Title LIKE ? OR i.Content LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }

        if (source) {
            conditions.push('i.Source = ?');
            params.push(source);
        }

        if (minScore > 0) {
            conditions.push('t.QualityScore >= ?');
            params.push(minScore);
        }

        const where = conditions.join(' AND ');

        const items = await query<{
            Id: number; Title: string; Source: string; Content: string;
            Url: string; Author: string; CrawlTime: string; IngestedAt: string;
            Images: string;
            AiSummary: string; AiReasoning: string; QualityScore: number;
            Domain: string; CategoryPath: string; KeywordsJson: string;
        }>(
            `SELECT i.Id, i.Title, i.Source, i.Content, i.Url, i.Author,
                    i.CrawlTime, i.IngestedAt, i.Images,
                    t.AiSummary, t.AiReasoning, t.QualityScore,
                    COALESCE(t.Domain, '') as Domain,
                    COALESCE(t.CategoryPath, '') as CategoryPath,
                    COALESCE(t.KeywordsJson, '[]') as KeywordsJson
             FROM IntelligenceItems i
             LEFT JOIN IntelligenceTaggings t ON t.ItemId = i.Id
             WHERE ${where}
             ORDER BY i.IngestedAt DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const countRows = await query<{ cnt: number }>(
            `SELECT COUNT(*) as cnt
             FROM IntelligenceItems i
             LEFT JOIN IntelligenceTaggings t ON t.ItemId = i.Id
             WHERE ${where}`,
            params
        );

        const data = items.map(item => {
            let images: string[] = [];
            try {
                const parsed = typeof item.Images === 'string' ? JSON.parse(item.Images) : item.Images;
                if (Array.isArray(parsed)) images = parsed.filter((u: string) => typeof u === 'string');
            } catch { /* ignore */ }

            let preview = item.Content || '';
            preview = preview.replace(/<img[^>]*\/?>/gi, '');
            preview = preview.replace(/<(?!\/?(?:span|a|b|i|em|strong)\b)[^>]+>/gi, '');
            if (preview.length > 400) preview = preview.slice(0, 400) + '...';

            let keywords: string[] = [];
            try {
                keywords = JSON.parse(item.KeywordsJson || '[]');
            } catch { /* ignore */ }

            const pathParts = item.CategoryPath.split('/').filter(Boolean);
            const tags = [...new Set([...pathParts, ...keywords])];

            return {
                id: item.Id,
                title: item.Title || '',
                source: item.Source || '',
                author: item.Author || '',
                preview,
                qualityScore: item.QualityScore ? Number(item.QualityScore) : null,
                crawlTime: item.CrawlTime,
                ingestedAt: item.IngestedAt,
                aiReasoning: item.AiReasoning || '',
                domain: item.Domain.toLowerCase(),
                categoryPath: item.CategoryPath,
                keywords,
                tags,
                url: item.Url || '',
                images: images.slice(0, 3),
            };
        });

        return NextResponse.json({
            success: true,
            data,
            total: countRows[0]?.cnt ?? 0,
        });
    } catch (err) {
        console.error('[API /academy/articles] Error:', err);
        return NextResponse.json({ success: false, error: '获取精读文章失败' }, { status: 500 });
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/academy/articles/route.ts
git commit -m "feat: articles API reads structured taxonomy with domain filter"
```

---

## Task 4: Update Narratives and Reports API Routes

**Files:**
- Modify: `app/api/academy/narratives/route.ts`
- Modify: `app/api/academy/reports/route.ts`

- [ ] **Step 1: Update narratives API**

Replace the content of `app/api/academy/narratives/route.ts` with:

```typescript
import { NextResponse } from 'next/server';
import { query } from '@/lib/db-console';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const rows = await query<{
            Id: number;
            Title: string;
            Description: string;
            Category: string;
            Phase: number;
            SignalStrength: string;
            ObjectiveSignalStrength: number;
            CoreEntities: string;
            RelatedArticleCount: number;
            CreatedAt: string;
            LifecycleStatus: number;
        }>(
            `SELECT Id, Title, Description, Category, Phase, SignalStrength,
                    ObjectiveSignalStrength, CoreEntities, RelatedArticleCount, CreatedAt, LifecycleStatus
             FROM IntelligenceNarratives
             WHERE LifecycleStatus = 0
             ORDER BY ObjectiveSignalStrength DESC`
        );

        const phaseMap: Record<number, string> = { 0: 'Emerging', 1: 'Rising', 2: 'Peak', 3: 'Cooling' };

        // Map Category to structured domain/categoryPath for narratives
        const mapCategory = (cat: string): { domain: string; categoryPath: string } => {
            const c = (cat || 'ai').toLowerCase();
            if (c === 'ai') return { domain: 'ai', categoryPath: 'AI' };
            if (c === 'web3') return { domain: 'finance', categoryPath: 'Finance/Web3' };
            if (c === 'finance') return { domain: 'finance', categoryPath: 'Finance' };
            if (c === 'global') return { domain: 'global', categoryPath: 'Global' };
            return { domain: c, categoryPath: cat };
        };

        const narratives = rows.map((r, i) => {
            const { domain, categoryPath } = mapCategory(r.Category);
            return {
                id: r.Id,
                rank: i + 1,
                title: r.Title,
                summary: r.Description,
                category: (r.Category || 'ai').toLowerCase(),
                domain,
                categoryPath,
                phase: phaseMap[r.Phase] ?? 'Emerging',
                heatScore: r.ObjectiveSignalStrength ?? 0,
                articleCount: r.RelatedArticleCount ?? 0,
                signalStrength: r.SignalStrength || null,
                coreEntities: r.CoreEntities ? r.CoreEntities.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
                createdAt: r.CreatedAt,
            };
        });

        return NextResponse.json({ success: true, data: narratives });
    } catch (err) {
        console.error('[API /academy/narratives] Error:', err);
        return NextResponse.json({ success: false, error: '获取叙事列表失败' }, { status: 500 });
    }
}
```

- [ ] **Step 2: Update reports API**

Replace the content of `app/api/academy/reports/route.ts` with:

```typescript
import { NextResponse } from 'next/server';
import { query } from '@/lib/db-console';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const reports = await query<{
            Id: number; Title: string; Category: string;
            ExecutiveSummary: string; SourceArticleCount: number;
            NarrativeCount: number; CreatedAt: string;
        }>(
            `SELECT Id, Title, Category, ExecutiveSummary, SourceArticleCount, NarrativeCount, CreatedAt
             FROM IntelligenceMarketReports
             WHERE LifecycleStatus = 0
             ORDER BY CreatedAt DESC
             LIMIT 20`
        );

        const mapCategory = (cat: string): { domain: string; categoryPath: string } => {
            const c = (cat || 'ai').toLowerCase();
            if (c === 'ai') return { domain: 'ai', categoryPath: 'AI' };
            if (c === 'web3') return { domain: 'finance', categoryPath: 'Finance/Web3' };
            if (c === 'finance') return { domain: 'finance', categoryPath: 'Finance' };
            if (c === 'global') return { domain: 'global', categoryPath: 'Global' };
            return { domain: c, categoryPath: cat };
        };

        const data = reports.map(r => {
            const { domain, categoryPath } = mapCategory(r.Category);
            return {
                id: r.Id,
                title: r.Title,
                category: (r.Category || 'ai').toLowerCase(),
                domain,
                categoryPath,
                summary: r.ExecutiveSummary || '',
                articleCount: r.SourceArticleCount ?? 0,
                narrativeCount: r.NarrativeCount ?? 0,
                createdAt: r.CreatedAt,
            };
        });

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('[API /academy/reports] Error:', err);
        return NextResponse.json({ success: false, error: '获取研报列表失败' }, { status: 500 });
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/academy/narratives/route.ts app/api/academy/reports/route.ts
git commit -m "feat: narratives and reports API add domain/categoryPath fields"
```

---

## Task 5: Update Quicknews Page

**Files:**
- Modify: `app/academy/quicknews/page.tsx`

- [ ] **Step 1: Replace interface, helpers, and filter logic**

Replace the content of `app/academy/quicknews/page.tsx` with:

```typescript
'use client';

import './quicknews.css';
import { useState, useEffect, useMemo, useCallback } from 'react';

interface FeedItem {
  id: number;
  title: string;
  source: string;
  summary: string;
  qualityScore: number | null;
  crawlTime: string;
  ingestedAt: string;
  contentType: string;
  aiReasoning: string;
  domain: string;
  categoryPath: string;
  keywords: string[];
  tags: string[];
  url: string;
  images: string[];
}

function formatTime(dt: string): string {
  if (!dt) return '';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getDateKey(dt: string): string {
  if (!dt) return 'unknown';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return 'unknown';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDateLabel(dateKey: string): string {
  if (dateKey === 'unknown') return '未知日期';
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  const shortDate = dateKey.slice(5).replace('-', '.');

  if (dateKey === todayKey) return `今天 · ${shortDate}`;
  if (dateKey === yesterdayKey) return `昨天 · ${shortDate}`;
  return shortDate;
}

type SortMode = 'time' | 'score';
type DomainFilter = 'all' | 'ai' | 'finance' | 'global';

const DOMAINS: { key: DomainFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'ai', label: 'AI' },
  { key: 'finance', label: 'Finance' },
  { key: 'global', label: 'Global' },
];

function TaxonomyBadges({ domain, categoryPath, keywords }: { domain: string; categoryPath: string; keywords: string[] }) {
  const parts = categoryPath.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <span className="feed-taxonomy">
      {parts.map((part, i) => (
        <span key={i}>
          {i === 0 ? (
            <span className={`feed-domain-badge ${domain}`}>{part}</span>
          ) : (
            <>
              <span className="feed-taxonomy-sep">/</span>
              <span className={`feed-subcat-badge ${domain}`}>{part}</span>
            </>
          )}
        </span>
      ))}
      {keywords.length > 0 && (
        <>
          <span className="feed-taxonomy-divider">|</span>
          {keywords.slice(0, 3).map((kw, i) => (
            <span key={i} className="feed-kw-chip">{kw}</span>
          ))}
        </>
      )}
    </span>
  );
}

export default function QuickNewsPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [activeDomain, setActiveDomain] = useState<DomainFilter>('all');
  const [activeSubcat, setActiveSubcat] = useState<string>('');
  const [sortMode, setSortMode] = useState<SortMode>('time');
  const [sortOpen, setSortOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/academy/quicknews')
      .then(r => r.json())
      .then(res => {
        if (res.success) setItems(res.data);
        else setError(res.error);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = useCallback((id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else { next.clear(); next.add(id); }
      return next;
    });
  }, []);

  // Derive subcategories for the active domain
  const subcategories = useMemo(() => {
    if (activeDomain === 'all') return [];
    const subs = new Set<string>();
    items.forEach(item => {
      if (item.domain === activeDomain) {
        const parts = item.categoryPath.split('/').filter(Boolean);
        if (parts.length > 1) subs.add(parts[1]);
      }
    });
    return [...subs].sort();
  }, [items, activeDomain]);

  const filteredItems = useMemo(() => {
    let result = items;

    if (activeDomain !== 'all') {
      result = result.filter(item => item.domain === activeDomain);
    }

    if (activeSubcat) {
      result = result.filter(item => {
        const parts = item.categoryPath.split('/').filter(Boolean);
        return parts.length > 1 && parts[1] === activeSubcat;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item =>
        item.title.toLowerCase().includes(q) ||
        (item.summary || '').toLowerCase().includes(q) ||
        (item.keywords || []).some(k => k.toLowerCase().includes(q))
      );
    }

    if (sortMode === 'score') {
      result = [...result].sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
    }

    return result;
  }, [items, activeDomain, activeSubcat, searchQuery, sortMode]);

  const dateGroups = useMemo(() => {
    const groupMap = new Map<string, FeedItem[]>();

    for (const item of filteredItems) {
      const key = getDateKey(item.ingestedAt || item.crawlTime);
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(item);
    }

    const groups: { dateKey: string; label: string; items: FeedItem[] }[] = [];
    for (const [key, groupItems] of groupMap) {
      groups.push({ dateKey: key, label: getDateLabel(key), items: groupItems });
    }

    return groups;
  }, [filteredItems]);

  if (loading) return <div className="quicknews-wrap"><div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>加载中...</div></div>;
  if (error) return <div className="quicknews-wrap"><div style={{ padding: '3rem', textAlign: 'center', color: '#f87171' }}>{error}</div></div>;

  return (
    <div className="quicknews-wrap">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">信息流</h1>
            <p className="page-desc">AI 从全球信息源中实时分拣的高价值资讯，与社员共享信息源。每条内容均由 AI 筛选并附评分与入选理由，只留值得你花时间关注的信息。</p>
          </div>
          <div className="live-stats">
            <span className="live-dot" />
            已收录 <span className="live-stats-count">{items.length}</span> 条
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        {DOMAINS.map(d => (
          <button key={d.key} className={`filter-tab ${activeDomain === d.key ? 'active' : ''}`} onClick={() => { setActiveDomain(d.key); setActiveSubcat(''); }}>
            <span className={`tab-dot ${d.key === 'all' ? 'all' : d.key}`} />{d.label}
          </button>
        ))}
        <div className="filter-right">
          <div className={`sort-dropdown ${sortOpen ? 'open' : ''}`}>
            <button className="sort-btn" onClick={() => setSortOpen(!sortOpen)}>
              <i className="bi bi-sort-down" /> {sortMode === 'time' ? '按时间' : '按评分'}
            </button>
            <div className="sort-menu">
              <div className={`sort-option ${sortMode === 'time' ? 'active' : ''}`} onClick={() => { setSortMode('time'); setSortOpen(false); }}>按时间</div>
              <div className={`sort-option ${sortMode === 'score' ? 'active' : ''}`} onClick={() => { setSortMode('score'); setSortOpen(false); }}>按评分</div>
            </div>
          </div>
          <div className={`search-wrap ${searchOpen ? 'open' : ''}`}>
            <button className="filter-search" onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchQuery(''); }}>
              <i className="bi bi-search" />
            </button>
            <input
              className="search-input"
              type="text"
              placeholder="搜索信息流..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Sub-category filter */}
      {subcategories.length > 0 && (
        <div className="filter-sub">
          <button className={`filter-sub-btn ${activeSubcat === '' ? 'active' : ''}`} onClick={() => setActiveSubcat('')}>全部</button>
          {subcategories.map(sub => (
            <button key={sub} className={`filter-sub-btn ${activeSubcat === sub ? 'active' : ''}`} onClick={() => setActiveSubcat(sub)}>{sub}</button>
          ))}
        </div>
      )}

      {/* Feed by Date */}
      {dateGroups.map(group => (
        <div key={group.dateKey}>
          <div className="date-separator">
            <span className="date-separator-text">{group.label}</span>
            <div className="date-separator-line" />
          </div>
          <div className="feed-list">
            {group.items.map((item, idx) => {
              const isExpanded = expanded.has(item.id);
              const time = formatTime(item.ingestedAt || item.crawlTime);
              const isNew = item.qualityScore !== null && item.qualityScore >= 8;

              return (
                <div
                  key={item.id}
                  className={`feed-item ${isExpanded ? 'expanded' : ''}`}
                  style={{ animationDelay: `${Math.min(idx, 17) * 0.03}s` }}
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="feed-time-col">
                    <span className="feed-time">{time}</span>
                  </div>
                  <div className="feed-content">
                    <div className="feed-meta-row">
                      <TaxonomyBadges domain={item.domain} categoryPath={item.categoryPath} keywords={item.keywords} />
                      {isNew && <span className="feed-new">NEW</span>}
                    </div>
                    <div className="feed-headline">{item.title}</div>
                    {!isExpanded && item.summary && (
                      <div className="feed-summary" style={{
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {item.summary}
                      </div>
                    )}
                    {isExpanded && (
                      <div className="feed-detail">
                        <div className="feed-detail-text">{item.summary}</div>
                        {item.images && item.images.length > 0 && (
                          <div className="feed-images">
                            {item.images.map((img, i) => (
                              <img key={i} src={img} alt="" className="feed-img" loading="lazy" />
                            ))}
                          </div>
                        )}
                        {item.aiReasoning && (
                          <div className="feed-ai-reasoning">
                            <i className="bi bi-lightbulb" /> {item.aiReasoning}
                          </div>
                        )}
                        <div className="feed-detail-actions">
                          <span><i className="bi bi-clock" /> {time}</span>
                          <span className="feed-source-tag"><i className="bi bi-arrow-repeat" /> {item.source}</span>
                          {item.url && (
                            <a
                              className="feed-ext-link"
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                            >
                              查看原文 <i className="bi bi-box-arrow-up-right" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="feed-score-row">
                      {item.qualityScore !== null && (
                        <span className={`feed-score ${(item.qualityScore ?? 0) >= 7 ? 'high' : (item.qualityScore ?? 0) >= 4 ? 'mid' : 'low'}`}>
                          <i className="bi bi-star" /> {Number(item.qualityScore).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <i className="bi bi-chevron-right feed-expand" />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filteredItems.length === 0 && (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
          {items.length === 0 ? '暂无信息流数据' : '没有匹配的结果'}
        </div>
      )}

      <div className="scroll-sentinel">
        <span>已加载全部信息流</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/academy/quicknews/page.tsx
git commit -m "feat: quicknews page uses structured taxonomy with domain filter and breadcrumbs"
```

---

## Task 6: Update Articles Page

**Files:**
- Modify: `app/academy/articles/page.tsx`

- [ ] **Step 1: Update interface, tag styling, and filter logic**

Apply these changes to `app/academy/articles/page.tsx`:

1. Update the `Article` interface (line 6-19) — add `domain`, `categoryPath`, `keywords`:

```typescript
interface Article {
  id: number;
  title: string;
  source: string;
  author: string;
  preview: string;
  qualityScore: number | null;
  crawlTime: string;
  ingestedAt: string;
  aiReasoning: string;
  domain: string;
  categoryPath: string;
  keywords: string[];
  tags: string[];
  url: string;
  images: string[];
}
```

2. Replace the `tagStyle` function (line 37-43) with a domain-based helper and a `TaxonomyBadges` component:

```typescript
const domainClass = (domain: string): string => {
  if (domain === 'ai') return 'ai';
  if (domain === 'finance') return 'finance';
  if (domain === 'global') return 'global';
  return 'other';
};

function ArticleTaxonomy({ domain, categoryPath, keywords }: { domain: string; categoryPath: string; keywords: string[] }) {
  const parts = categoryPath.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <span className="article-card-tags">
      {parts.map((part, i) => (
        <span key={i}>
          {i === 0 ? (
            <span className={`article-card-tag ${domainClass(domain)}`}>{part}</span>
          ) : (
            <>
              <span className="article-taxonomy-sep">/</span>
              <span className={`article-card-tag ${domainClass(domain)}`} style={{ opacity: 0.7 - i * 0.15 }}>{part}</span>
            </>
          )}
        </span>
      ))}
      {keywords.length > 0 && (
        <>
          <span className="article-taxonomy-sep" style={{ margin: '0 3px' }}>|</span>
          {keywords.slice(0, 2).map((kw, i) => (
            <span key={i} className="article-kw-chip">{kw}</span>
          ))}
        </>
      )}
    </span>
  );
}
```

3. Change `CategoryTab` type (line 65):

```typescript
type CategoryTab = 'all' | 'AI' | 'Finance' | 'Global';
```

4. Replace the filter tab buttons (line 188-196):

```typescript
        {(['all', 'AI', 'Finance', 'Global'] as CategoryTab[]).map(tab => (
          <button
            key={tab}
            className={`filter-tab ${category === tab ? 'active' : ''}`}
            onClick={() => setCategory(tab)}
          >
            {tab === 'all' ? <><span className="tab-dot all" />全部</> : <><span className={`tab-dot ${tab.toLowerCase()}`} />{tab}</>}
          </button>
        ))}
```

5. Update `buildUrl` (line 96-101) to use `domain` query param when not 'all':

```typescript
  const buildUrl = useCallback((off: number) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(off) });
    if (category !== 'all') params.set('domain', category.toLowerCase());
    if (search.trim()) params.set('search', search.trim());
    return `/api/academy/articles?${params}`;
  }, [category, search]);
```

6. Replace the article card tag rendering (line 265-268) with the taxonomy component:

```typescript
                  <div className="article-card-footer">
                    <ArticleTaxonomy domain={article.domain} categoryPath={article.categoryPath} keywords={article.keywords} />
                    <div className="article-card-links">
```

- [ ] **Step 2: Commit**

```bash
git add app/academy/articles/page.tsx
git commit -m "feat: articles page uses structured taxonomy with domain filter and breadcrumbs"
```

---

## Task 7: Update Narratives Page

**Files:**
- Modify: `app/academy/narratives/page.tsx`

- [ ] **Step 1: Update narrative list item and filter**

Apply these changes to `app/academy/narratives/page.tsx`:

1. Update `NarrativeListItem` interface (line 25-30) — add `domain`, `categoryPath`:

```typescript
interface NarrativeListItem {
  id: number; rank: number; title: string; category: string;
  domain: string; categoryPath: string;
  phase: string; heatScore: number; articleCount: number;
  signalStrength: string | null; coreEntities: string[];
  summary: string; createdAt: string;
}
```

2. Change the filter list (line 123) from `['all', 'ai', 'web3', 'finance']` to:

```typescript
            {['all', 'ai', 'finance', 'global'].map(cat => (
              <button key={cat} className={`narr-filter-btn ${filter === cat ? 'active' : ''}`} onClick={() => setFilter(cat)}>
                {cat === 'all' ? '全部' : cat === 'ai' ? 'AI' : cat === 'finance' ? '金融' : 'Global'}
              </button>
            ))}
```

3. Update the filter logic (line 106) to filter by `domain` instead of `category`:

```typescript
  const filtered = filter === 'all' ? list : list.filter(n => n.domain === filter);
```

4. Replace the narrative card category badge (line 141) with a breadcrumb:

Change from:
```typescript
                  <span className={`narr-cat ${n.category}`}>{n.category.toUpperCase()}</span>
```

To:
```typescript
                  <span className="narr-taxonomy">
                    <span className={`narr-cat ${n.domain}`}>{n.categoryPath.split('/')[0] || n.category.toUpperCase()}</span>
                    {n.categoryPath.split('/').filter(Boolean).slice(1).map((part, i) => (
                      <span key={i}><span className="narr-taxonomy-sep">/</span><span className={`narr-subcat ${n.domain}`}>{part}</span></span>
                    ))}
                  </span>
```

- [ ] **Step 2: Commit**

```bash
git add app/academy/narratives/page.tsx
git commit -m "feat: narratives page uses domain filter and taxonomy breadcrumb"
```

---

## Task 8: Update Reports Page

**Files:**
- Modify: `app/academy/reports/page.tsx`

- [ ] **Step 1: Update report interface, filter, and badge display**

Apply these changes to `app/academy/reports/page.tsx`:

1. Update `Report` interface (line 6-14) — add `domain`, `categoryPath`:

```typescript
interface Report {
  id: number;
  title: string;
  category: string;
  domain: string;
  categoryPath: string;
  summary: string;
  articleCount: number;
  narrativeCount: number;
  createdAt: string;
}
```

2. Update `ReportDetail` interface (line 16-32) — add `domain`, `categoryPath`:

```typescript
interface ReportDetail {
  id: number;
  title: string;
  category: string;
  domain: string;
  categoryPath: string;
  createdAt: string;
  articleCount: number;
  narrativeCount: number;
  executiveSummary: string;
  signalSummary: { ... } | null;
  sections: { ... }[] | null;
  trendChanges: { ... }[] | null;
}
```

3. Change filter list (line 111) from `['all', 'ai', 'web3', 'finance']` to:

```typescript
            {['all', 'ai', 'finance', 'global'].map(cat => (
              <button key={cat} className={`rpt-filter-btn ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>
                {cat === 'all' ? '全部' : cat.toUpperCase()}
              </button>
            ))}
```

4. Update filter logic (line 94-96) to filter by `domain`:

```typescript
  const filteredReports = activeCategory === 'all'
    ? reports
    : reports.filter(r => r.domain === activeCategory);
```

5. Update report card category badge (line 131):

```typescript
                <span className={`rpt-cat ${r.domain}`}>{r.categoryPath.split('/')[0] || r.category.toUpperCase()}</span>
```

- [ ] **Step 2: Commit**

```bash
git add app/academy/reports/page.tsx
git commit -m "feat: reports page uses domain filter and taxonomy display"
```

---

## Task 9: Update Intel Page

**Files:**
- Modify: `app/intel/page.tsx`

- [ ] **Step 1: Update news item tags and narrative filter/display**

Apply these changes to `app/intel/page.tsx`:

1. Update `QuickNewsItem` interface (line 8-17) — add `domain`, `categoryPath`, `keywords`:

```typescript
interface QuickNewsItem {
  id: number;
  title: string;
  source: string;
  summary: string;
  qualityScore: number | null;
  crawlTime: string;
  domain: string;
  categoryPath: string;
  keywords: string[];
  tags: string[];
  url?: string;
}
```

2. Update `NarrativeItem` interface (line 19-30) — add `domain`, `categoryPath`:

```typescript
interface NarrativeItem {
  id: number;
  title: string;
  summary: string;
  category: string;
  domain: string;
  categoryPath: string;
  phase: 'Emerging' | 'Rising' | 'Peak' | 'Cooling';
  heatScore: number;
  articleCount: number;
  coreEntities: string[];
  createdAt: string;
  signalStrength: string;
}
```

3. Update `NarrFilter` type (line 58):

```typescript
type NarrFilter = 'all' | 'ai' | 'finance' | 'global';
```

4. Update `catClass` function (line 84-91) to use `domain`:

```typescript
function catClass(domain: string) {
  if (domain === 'ai') return 'ai';
  if (domain === 'finance') return 'finance';
  if (domain === 'global') return 'global';
  return 'default';
}
```

5. Update narrative filter (line 169):

```typescript
  const filteredNarr = narrFilter === 'all' ? narratives : narratives.filter(n => n.domain === narrFilter);
```

6. Replace news card tag display (line 262-267) with taxonomy breadcrumb:

```typescript
                {(item.categoryPath || item.tags.length > 0) && (
                  <div className="intel-news-card-tags">
                    {item.categoryPath ? (() => {
                      const parts = item.categoryPath.split('/').filter(Boolean);
                      return parts.map((part, i) => (
                        <span key={i}>
                          {i === 0 ? (
                            <span className={`intel-cat intel-cat--${catClass(item.domain)}`}>{part}</span>
                          ) : (
                            <span key={i} className={`intel-subcat ${item.domain}`}>{part}</span>
                          )}
                        </span>
                      ));
                    })() : [...new Set(item.tags)].slice(0, 4).map(tag => (
                      <span key={tag} className="intel-news-card-tag">{tag}</span>
                    ))}
                  </div>
                )}
```

7. Update narrative filter buttons (line 302-304):

```typescript
          {(['all', 'ai', 'finance', 'global'] as NarrFilter[]).map(c => (
            <button key={c} className={`intel-narr-filter-btn ${narrFilter === c ? 'active' : ''}`} onClick={() => setNarrFilter(c)}>
              {c === 'all' ? '全部' : c === 'ai' ? 'AI' : c === 'finance' ? '金融' : 'Global'}
            </button>
          ))}
```

8. Update narrative card category badge (line 318):

```typescript
                  <span className={`intel-cat intel-cat--${catClass(item.domain)}`}>{(item.categoryPath.split('/')[0] || item.category).toUpperCase()}</span>
```

- [ ] **Step 2: Commit**

```bash
git add app/intel/page.tsx
git commit -m "feat: intel page uses structured taxonomy for news cards and narrative panel"
```

---

## Task 10: Final Verification

**Files:**
- All modified files from Tasks 1-9

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 2: Search for old patterns**

```bash
grep -rn "Tags.split\|Tags LIKE\|inferCategory\|categoryFromTags\|tagStyle\|'web3'.*'ai'.*'finance'" app/ --include='*.tsx' --include='*.ts'
```

Expected: no matches (all old patterns have been replaced).

- [ ] **Step 3: Run dev server and manually verify**

```bash
npm run dev
```

Check these pages in browser:
1. `/academy/quicknews` — domain filter tabs, sub-category filter, breadcrumb tags on cards
2. `/academy/articles` — domain filter, breadcrumb tags on cards
3. `/academy/narratives` — domain filter, breadcrumb on narrative items
4. `/academy/reports` — domain filter, category badge
5. `/intel` — news card taxonomy, narrative panel filter

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: taxonomy adaptation final cleanup"
```
