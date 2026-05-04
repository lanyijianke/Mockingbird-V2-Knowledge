# 情报站 + 品牌重定位 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `/intel` 情报站页面（卡片网格），更新首页标语和入口按钮

**Architecture:** `/intel` 为品牌门户下一级独立页面。服务端组件负责 metadata，客户端组件负责数据获取、筛选和交互。复用现有 `/api/academy/quicknews` 和 `/api/academy/narratives` 接口，不修改后端逻辑。未登录用户可浏览卡片列表，点击详情弹出登录引导。

**Tech Stack:** Next.js App Router, React 19, CSS Modules（全局 CSS 文件）, mysql2, Bootstrap Icons

---

## Task 1: 更新首页标语和入口按钮

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/_styles/brand-home.css`

- [ ] **Step 1: 更新标语文案**

在 `app/page.tsx` 中，将 slogan 从「一群 AI 智能体组成的情报团队」改为「AI 智能体团队 7×24 为你追踪有价值的信号」：

```tsx
// app/page.tsx — 修改 slogan 行
<p className="brand-hero-slogan">AI 智能体团队 7×24 为你追踪有价值的信号</p>
```

- [ ] **Step 2: 添加第三个入口按钮**

在 `app/page.tsx` 的 `brand-entries-row` 中，在金融按钮后添加情报站按钮：

```tsx
<Link href="/intel" className="brand-entry-btn brand-entry-btn--intel">
    <i className="bi bi-rss" />
    <span>情报站</span>
    <i className="bi bi-arrow-right brand-entry-btn-arrow" />
</Link>
```

- [ ] **Step 3: 添加情报站按钮样式**

在 `app/_styles/brand-home.css` 中，在 `.brand-entry-btn--finance:hover` 规则之后添加：

```css
.brand-entry-btn--intel {
    border-color: rgba(192, 240, 251, 0.08);
}

.brand-entry-btn--intel:hover {
    border-color: rgba(192, 240, 251, 0.4);
    background: rgba(192, 240, 251, 0.08);
    color: var(--accent);
    box-shadow: 0 0 25px rgba(192, 240, 251, 0.1), inset 0 0 25px rgba(192, 240, 251, 0.03);
}
```

- [ ] **Step 4: 验证首页渲染**

启动 dev server（`npm run dev`），访问 `http://localhost:5046`，确认：
- 标语显示为新文案
- 三个按钮（AI / 金融 / 情报站）等宽并排
- 情报站按钮 hover 效果正常

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/_styles/brand-home.css
git commit -m "feat: update homepage slogan and add intel entry button"
```

---

## Task 2: 创建情报站页面和样式

**Files:**
- Create: `app/intel/page.tsx`
- Create: `app/_styles/intel.css`

- [ ] **Step 1: 创建 intel 页面服务端组件**

创建 `app/intel/page.tsx`：

```tsx
import type { Metadata } from 'next';
import '@/app/_styles/intel.css';
import IntelFeed from './IntelFeed';

export const runtime = 'nodejs';

export const metadata: Metadata = {
    title: '情报站 - 知更鸟',
    description: 'AI 智能体团队 7×24 为你追踪有价值的信号',
};

export default function IntelPage() {
    return (
        <div className="intel-page">
            <div className="intel-header">
                <h1 className="intel-title">情报站</h1>
                <p className="intel-subtitle">
                    快讯与叙事追踪，实时掌握有价值的信号
                </p>
            </div>
            <IntelFeed />
        </div>
    );
}
```

- [ ] **Step 2: 创建情报站样式文件**

创建 `app/_styles/intel.css`：

```css
/* ═══ Intel Feed Page ═══ */

.intel-page {
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem 1rem 4rem;
}

.intel-header {
    text-align: center;
    margin-bottom: 3rem;
}

.intel-title {
    font-family: var(--font-serif);
    font-size: 2rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: var(--text-main);
    margin-bottom: 0.5rem;
}

.intel-subtitle {
    font-size: 0.95rem;
    color: var(--text-muted);
}

/* ═══ Filter Bar ═══ */
.intel-filter {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
}

.intel-filter-btn {
    padding: 0.4rem 1rem;
    border: 1px solid var(--glass-border);
    background: transparent;
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
    border-radius: var(--radius-md);
}

.intel-filter-btn:hover {
    border-color: rgba(255, 255, 255, 0.15);
    color: var(--text-main);
}

.intel-filter-btn.active {
    border-color: var(--primary);
    color: var(--primary);
    background: rgba(192, 240, 251, 0.08);
}

/* ═══ Card Grid ═══ */
.intel-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
}

/* ═══ Card Base ═══ */
.intel-card {
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 1.25rem;
    background: var(--glass-bg);
    cursor: pointer;
    transition: all 0.3s ease;
}

.intel-card:hover {
    border-color: rgba(255, 255, 255, 0.12);
    background: var(--glass-bg-hover);
    transform: translateY(-2px);
}

/* ═══ Narrative Card ═══ */
.intel-card--narrative {
    border-color: rgba(192, 240, 251, 0.15);
}

.intel-card--narrative:hover {
    border-color: rgba(192, 240, 251, 0.35);
    box-shadow: 0 0 20px rgba(192, 240, 251, 0.06);
}

.intel-card-phase {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 0.5rem;
}

.intel-card-phase--emerging { color: #888; }
.intel-card-phase--rising { color: var(--primary); }
.intel-card-phase--peak { color: var(--text-main); }
.intel-card-phase--cooling { color: #555; }

.intel-card-title {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--text-main);
    line-height: 1.5;
    margin-bottom: 0.75rem;
}

.intel-card-meta {
    display: flex;
    gap: 0.75rem;
    font-size: 0.75rem;
    color: var(--text-muted);
    font-family: var(--font-mono);
}

/* ═══ News Card ═══ */
.intel-card-time {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
}

.intel-card-source {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--text-muted);
    margin-top: 0.5rem;
}

/* ═══ Loading / Empty ═══ */
.intel-loading {
    text-align: center;
    padding: 4rem 1rem;
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-size: 0.85rem;
}

.intel-empty {
    text-align: center;
    padding: 4rem 1rem;
    color: var(--text-muted);
}

/* ═══ Login Gate Modal ═══ */
.intel-login-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.intel-login-modal {
    background: var(--bg-secondary);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: 2.5rem;
    max-width: 400px;
    width: 90%;
    text-align: center;
}

.intel-login-modal h3 {
    font-family: var(--font-serif);
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
    color: var(--text-main);
}

.intel-login-modal p {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-bottom: 1.5rem;
    line-height: 1.6;
}

.intel-login-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
}

.intel-login-btn {
    padding: 0.6rem 1.5rem;
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
}

.intel-login-btn--primary {
    background: var(--primary);
    color: #000;
    border: none;
}

.intel-login-btn--primary:hover {
    opacity: 0.9;
}

.intel-login-btn--secondary {
    background: transparent;
    color: var(--text-muted);
    border: 1px solid var(--glass-border);
}

.intel-login-btn--secondary:hover {
    border-color: rgba(255, 255, 255, 0.2);
    color: var(--text-main);
}

/* ═══ Card Detail Expansion ═══ */
.intel-card-detail {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--glass-border);
    font-size: 0.85rem;
    color: var(--text-muted);
    line-height: 1.7;
}

/* ═══ Responsive ═══ */
@media (max-width: 768px) {
    .intel-grid {
        grid-template-columns: 1fr;
    }

    .intel-title {
        font-size: 1.6rem;
    }
}

@media (min-width: 769px) and (max-width: 960px) {
    .intel-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}
```

- [ ] **Step 3: 验证页面可访问**

访问 `http://localhost:5046/intel`，确认页面渲染（此时 IntelFeed 还未实现，会显示空白或 loading 状态，这是预期的）。

- [ ] **Step 4: Commit**

```bash
git add app/intel/page.tsx app/_styles/intel.css
git commit -m "feat: add intel page skeleton and styles"
```

---

## Task 3: 创建 IntelFeed 客户端组件

**Files:**
- Create: `app/intel/IntelFeed.tsx`

- [ ] **Step 1: 创建 IntelFeed 组件**

创建 `app/intel/IntelFeed.tsx`，负责数据获取、筛选、卡片渲染和登录引导：

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

/* ── Types ── */

interface QuickNewsItem {
    id: number;
    title: string;
    source: string;
    summary: string;
    qualityScore: number | null;
    crawlTime: string;
    tags: string[];
}

interface NarrativeItem {
    id: number;
    title: string;
    summary: string;
    phase: 'Emerging' | 'Rising' | 'Peak' | 'Cooling';
    heatScore: number;
    articleCount: number;
    coreEntities: string[];
    createdAt: string;
}

interface UserInfo {
    id: string;
    name: string;
    role: string;
}

type FeedItem =
    | ({ type: 'news' } & QuickNewsItem)
    | ({ type: 'narrative' } & NarrativeItem);

/* ── Helpers ── */

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} 分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    return `${days} 天前`;
}

const PHASE_LABEL: Record<string, string> = {
    Emerging: '萌芽期',
    Rising: '上升期',
    Peak: '高峰期',
    Cooling: '冷却期',
};

type Filter = 'all' | 'news' | 'narrative';

/* ── Component ── */

export default function IntelFeed() {
    const [items, setItems] = useState<FeedItem[]>([]);
    const [filter, setFilter] = useState<Filter>('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<UserInfo | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [showLoginModal, setShowLoginModal] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch('/api/academy/quicknews').then(r => r.json()),
            fetch('/api/academy/narratives').then(r => r.json()),
            fetch('/api/auth/me').then(r => r.ok ? r.json() : { user: null }),
        ])
            .then(([newsRes, narrativesRes, authRes]) => {
                const news: FeedItem[] = (newsRes.data ?? []).map(
                    (item: QuickNewsItem) => ({ ...item, type: 'news' as const })
                );
                const narratives: FeedItem[] = (narrativesRes.data ?? []).map(
                    (item: NarrativeItem) => ({ ...item, type: 'narrative' as const })
                );

                const merged = [...news, ...narratives].sort((a, b) => {
                    const ta = new Date(a.type === 'news' ? a.crawlTime : a.createdAt).getTime();
                    const tb = new Date(b.type === 'news' ? b.crawlTime : b.createdAt).getTime();
                    return tb - ta;
                });

                setItems(merged);
                setUser(authRes.user ?? null);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const filtered = filter === 'all'
        ? items
        : items.filter(i => i.type === filter);

    const handleCardClick = useCallback((item: FeedItem) => {
        if (!user) {
            setShowLoginModal(true);
            return;
        }
        setExpandedId(prev => prev === item.id ? null : item.id);
    }, [user]);

    if (loading) {
        return <div className="intel-loading">正在加载情报...</div>;
    }

    if (error) {
        return <div className="intel-empty">加载失败：{error}</div>;
    }

    return (
        <>
            {/* Filter Bar */}
            <div className="intel-filter">
                {(['all', 'news', 'narrative'] as Filter[]).map(f => (
                    <button
                        key={f}
                        className={`intel-filter-btn ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f === 'all' ? '全部' : f === 'news' ? '快讯' : '叙事'}
                    </button>
                ))}
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                    {filtered.length} 条
                </span>
            </div>

            {/* Card Grid */}
            <div className="intel-grid">
                {filtered.map(item => (
                    item.type === 'narrative'
                        ? <NarrativeCard key={`n-${item.id}`} item={item} expanded={expandedId === item.id} onClick={() => handleCardClick(item)} />
                        : <NewsCard key={`q-${item.id}`} item={item} expanded={expandedId === item.id} onClick={() => handleCardClick(item)} />
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="intel-empty">暂无情报数据</div>
            )}

            {/* Login Modal */}
            {showLoginModal && (
                <div className="intel-login-overlay" onClick={() => setShowLoginModal(false)}>
                    <div className="intel-login-modal" onClick={e => e.stopPropagation()}>
                        <h3>登录查看详情</h3>
                        <p>注册后可查看完整的情报分析、事件链和关联信号。</p>
                        <div className="intel-login-actions">
                            <Link href="/login" className="intel-login-btn intel-login-btn--primary">登录</Link>
                            <Link href="/register" className="intel-login-btn intel-login-btn--secondary">注册</Link>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/* ── Sub-components ── */

function NarrativeCard({ item, expanded, onClick }: {
    item: NarrativeItem & { type: 'narrative' };
    expanded: boolean;
    onClick: () => void;
}) {
    return (
        <div className="intel-card intel-card--narrative" onClick={onClick}>
            <div className={`intel-card-phase intel-card-phase--${item.phase.toLowerCase()}`}>
                ● {PHASE_LABEL[item.phase] ?? item.phase}
            </div>
            <div className="intel-card-title">{item.title}</div>
            <div className="intel-card-meta">
                <span>热度 {item.heatScore}</span>
                <span>{item.articleCount} 条关联</span>
                {item.coreEntities.length > 0 && (
                    <span>{item.coreEntities.slice(0, 2).join(' · ')}</span>
                )}
            </div>
            {expanded && (
                <div className="intel-card-detail">{item.summary}</div>
            )}
        </div>
    );
}

function NewsCard({ item, expanded, onClick }: {
    item: QuickNewsItem & { type: 'news' };
    expanded: boolean;
    onClick: () => void;
}) {
    return (
        <div className="intel-card" onClick={onClick}>
            <div className="intel-card-time">{timeAgo(item.crawlTime)}</div>
            <div className="intel-card-title">{item.title}</div>
            <div className="intel-card-source">{item.source}</div>
            {expanded && (
                <div className="intel-card-detail">{item.summary}</div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: 验证页面完整功能**

访问 `http://localhost:5046/intel`，确认：
- 卡片网格正确渲染（快讯和叙事混排）
- 筛选按钮（全部/快讯/叙事）切换正常
- 叙事卡片有青色边框和生命周期标识
- 未登录状态点击卡片弹出登录引导模态框
- 已登录状态点击卡片展开摘要

- [ ] **Step 3: Commit**

```bash
git add app/intel/IntelFeed.tsx
git commit -m "feat: add IntelFeed client component with card grid and login gate"
```

---

## Task 4: 更新 Middleware 和导航

**Files:**
- Modify: `middleware.ts`
- Modify: `app/SiteNav.tsx`

- [ ] **Step 1: 确认 middleware 公开访问**

在 `middleware.ts` 的 `PUBLIC_PREFIXES` 数组中确认 `/intel/` 前缀存在。如果不存在则添加：

```typescript
const PUBLIC_PREFIXES = [
    '/api/',
    '/ai/',
    '/finance/',
    '/intel/',   // ← 新增：情报站页面公开访问
    '/prompts/',
    '/articles/',
    '/rankings',
    '/_next/',
    '/content/',
    '/media/',
    '/favicon',
];
```

- [ ] **Step 2: 更新 SiteNav 导航**

在 `app/SiteNav.tsx` 中添加情报站导航。在 `isFinance` 判断之后添加 `isIntel`：

```typescript
const isIntel = pathname.startsWith('/intel');
```

添加情报站子导航块（在 finance 区块之后）：

```tsx
{/* ── Intel subsite navigation ── */}
{isIntel && (
    <>
        <Link href="/intel" className="nav-link">情报站</Link>
        <Link href="/academy/narratives" className="nav-link academy-link">学社</Link>
        <NavAuthButton />
    </>
)}
```

同时在「默认导航」区块中添加情报站链接：

```tsx
{!isAi && !isFinance && !isIntel && (
    <>
        <Link href={getArticleListPath('ai')} className="nav-link">AI</Link>
        <Link href={getArticleListPath('finance')} className="nav-link">金融</Link>
        <Link href="/intel" className="nav-link">情报站</Link>
        <Link href="/academy/narratives" className="nav-link academy-link">学社</Link>
        <NavAuthButton />
    </>
)}
```

注意：需要将原有的 `!isAi && !isFinance` 条件更新为 `!isAi && !isFinance && !isIntel`。

- [ ] **Step 3: 验证导航**

访问以下页面确认导航正确：
- `http://localhost:5046` — 默认导航显示「AI / 金融 / 情报站 / 学社」
- `http://localhost:5046/intel` — 情报站导航显示「情报站 / 学社」
- `http://localhost:5046/ai` — AI 导航不受影响

- [ ] **Step 4: Commit**

```bash
git add middleware.ts app/SiteNav.tsx
git commit -m "feat: add intel route to public middleware and site navigation"
```

---

## Task 5: 最终验证

- [ ] **Step 1: 完整流程验证**

1. 首页：标语更新，三个按钮（AI / 金融 / 情报站）可见
2. 点击情报站按钮 → 跳转 `/intel`
3. `/intel` 页面：卡片网格渲染，筛选按钮工作
4. 未登录点击卡片 → 登录引导弹窗
5. 登录后点击卡片 → 展开摘要
6. 从 `/intel` 页面导航到其他子站正常
7. 移动端响应式：卡片单列排列

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "feat: complete intel feed page with card grid, filters, and login gate"
```
