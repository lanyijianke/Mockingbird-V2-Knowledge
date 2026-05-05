# 情报站 Tab 切换布局 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将情报站从两个独立页面合并为一个 Tab 切换式页面，加入 Agent 工作状态卡片和统计汇总条。

**Architecture:** 单个客户端组件 `app/intel/page.tsx`，内含 Tab 状态管理和三个面板组件。Agent 状态数据来自新 API `/api/academy/agent-status`（初始阶段硬编码）。快讯和叙事的数据复用现有 API。

**Tech Stack:** Next.js 16 App Router, React 19, CSS Modules (plain CSS), mysql2

---

## File Structure

| 文件 | 职责 |
|------|------|
| `app/api/academy/agent-status/route.ts` | **新建** — Agent 状态 API，返回 4 个 agent 的工作状态和汇总统计 |
| `app/_styles/intel-main.css` | **新建** — 情报站主页全部样式（Agent 卡片、统计条、Tab 栏、快讯面板、叙事面板、付费墙） |
| `app/intel/page.tsx` | **重写** — Tab 切换主页，合并原 news 和 narratives 页面逻辑 |
| `app/SiteNav.tsx` | **修改** — Intel 子站导航改为单链接 |
| `app/page.tsx` | **修改** — 首页入口按钮合并为"情报站" |
| `app/intel/news/page.tsx` | **删除** |
| `app/intel/narratives/page.tsx` | **删除** |
| `app/_styles/intel-news.css` | **删除** |
| `app/_styles/intel-narratives.css` | **删除** |

---

### Task 1: 创建 Agent 状态 API

**Files:**
- Create: `app/api/academy/agent-status/route.ts`

- [ ] **Step 1: 创建 API 路由文件**

创建 `app/api/academy/agent-status/route.ts`：

```typescript
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// 初始阶段硬编码 Agent 状态，未来从 system_logs 或 job 队列表聚合
const AGENTS = [
    { id: 'sentinel', name: '哨兵', icon: '📡', status: 'active' as const, statusLabel: '爬取中', processed: 47, pending: 12, borderColor: '#00d4ff' },
    { id: 'goldvein', name: '金脉', icon: '💹', status: 'active' as const, statusLabel: '分析中', processed: 31, pending: 5, borderColor: '#ff9500' },
    { id: 'weaver', name: '织言', icon: '✍️', status: 'idle' as const, statusLabel: '空闲', processed: 18, pending: 0, borderColor: '#a855f7' },
    { id: 'probe', name: '探针', icon: '🔍', status: 'active' as const, statusLabel: '追踪中', processed: 9, pending: 3, borderColor: '#00ff88' },
];

export async function GET() {
    const agents = AGENTS.map(a => ({
        id: a.id,
        name: a.name,
        icon: a.icon,
        status: a.status,
        statusLabel: a.statusLabel,
        processed: a.processed,
        pending: a.pending,
        borderColor: a.borderColor,
    }));

    const total = agents.reduce((s, a) => s + a.processed + a.pending, 0);
    const processed = agents.reduce((s, a) => s + a.processed, 0);
    const pending = agents.reduce((s, a) => s + a.pending, 0);

    return NextResponse.json({
        success: true,
        data: {
            agents,
            summary: { total, processed, pending, queued: 3 },
        },
    });
}
```

- [ ] **Step 2: 验证 API**

Run: `curl -s http://localhost:5046/api/academy/agent-status | python3 -m json.tool`
Expected: JSON with `data.agents` array (4 items) and `data.summary` object

- [ ] **Step 3: Commit**

```bash
git add app/api/academy/agent-status/route.ts
git commit -m "feat: add agent-status API for intel page"
```

---

### Task 2: 创建情报站主页样式

**Files:**
- Create: `app/_styles/intel-main.css`

这个文件合并并重构 `intel-news.css` 和 `intel-narratives.css` 的样式，同时新增 Agent 卡片、统计条、Tab 栏的样式。

- [ ] **Step 1: 创建 CSS 文件**

创建 `app/_styles/intel-main.css`，内容如下：

```css
/* ════════════════════════════════════════════════════════════════
   Intel Main — Tab Layout with Agent Dashboard
   ════════════════════════════════════════════════════════════════ */

.intel-main {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 1.5rem 4rem;
}

/* ── Header ── */
.intel-header {
    padding: 1.5rem 0 0;
}

.intel-header-live {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
}

.intel-header-live-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #00d4ff;
    box-shadow: 0 0 8px #00d4ff;
    animation: intelPulse 2s ease-in-out infinite;
}

@keyframes intelPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
}

.intel-header-live-label {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: #00d4ff;
    letter-spacing: 0.08em;
}

.intel-header-title {
    font-family: var(--font-serif);
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-main);
    margin: 4px 0 0;
    letter-spacing: 0.04em;
}

/* ── Agent Cards ── */
.intel-agents {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    margin: 0.75rem 0;
}

.intel-agent-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 8px;
    padding: 0.55rem 0.65rem;
}

.intel-agent-top {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 5px;
}

.intel-agent-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    flex-shrink: 0;
}

.intel-agent-info {
    min-width: 0;
}

.intel-agent-name {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-main);
    line-height: 1.2;
}

.intel-agent-status {
    font-size: 0.6rem;
    line-height: 1.2;
}
.intel-agent-status--active { color: #00ff88; }
.intel-agent-status--idle { color: #888; }

.intel-agent-counts {
    display: flex;
    justify-content: space-between;
    font-family: var(--font-mono);
    font-size: 0.58rem;
    color: #666;
}
.intel-agent-counts b { color: #ccc; font-weight: 600; }
.intel-agent-counts .pending { color: #ff9500; }

.intel-agent-bar {
    height: 3px;
    background: rgba(255,255,255,0.06);
    border-radius: 2px;
    margin-top: 3px;
    overflow: hidden;
}

.intel-agent-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.5s ease;
}

/* ── Summary Stats ── */
.intel-summary {
    display: flex;
    gap: 0.75rem;
    padding: 0.45rem 0.9rem;
    background: rgba(255,255,255,0.02);
    border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.04);
    margin-bottom: 0.75rem;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    color: #888;
}

.intel-summary-sep {
    width: 1px;
    background: rgba(255,255,255,0.08);
}

.intel-summary b { font-weight: 600; }
.intel-summary .total { color: #fff; }
.intel-summary .processed { color: #00ff88; }
.intel-summary .pending { color: #ff9500; }
.intel-summary .queued { color: #666; }

/* ── Tab Bar ── */
.intel-tabs {
    display: flex;
    border-bottom: 1px solid var(--glass-border);
    gap: 0;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
}
.intel-tabs::-webkit-scrollbar { display: none; }

.intel-tab {
    padding: 0.6rem 1rem;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--text-muted);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
}
.intel-tab:hover { color: var(--text-main); }
.intel-tab.active {
    color: #00d4ff;
    border-bottom-color: #00d4ff;
    font-weight: 600;
}
.intel-tab.disabled {
    color: #555;
    cursor: default;
}

.intel-tab-badge {
    font-size: 0.6rem;
    padding: 0px 5px;
    border-radius: 8px;
    font-weight: 600;
}
.intel-tab.active .intel-tab-badge {
    background: rgba(0,212,255,0.15);
    color: #00d4ff;
}
.intel-tab:not(.active) .intel-tab-badge {
    background: rgba(255,255,255,0.06);
    color: #888;
}

/* ── Tab Panels ── */
.intel-panel { display: none; }
.intel-panel.active { display: block; }

/* ════════════════════════════════════════════════════════════════
   News Panel (from intel-news.css)
   ════════════════════════════════════════════════════════════════ */

.intel-news-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    margin-bottom: 0.5rem;
}

.intel-news-count {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--text-muted);
}

.intel-news-sort {
    display: flex;
    gap: 0.25rem;
}

.intel-news-sort-btn {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    padding: 0.25rem 0.6rem;
    border: 1px solid transparent;
    border-radius: 6px;
    background: none;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s;
}
.intel-news-sort-btn:hover { color: var(--text-main); }
.intel-news-sort-btn.active {
    border-color: rgba(255,255,255,0.1);
    color: var(--text-main);
    background: rgba(255,255,255,0.04);
}

/* Date Separator */
.intel-news-date {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-muted);
    padding: 0.6rem 0 0.3rem;
    letter-spacing: 0.04em;
    display: flex;
    align-items: center;
    gap: 0.75rem;
}
.intel-news-date::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.04);
}

/* News Card */
.intel-news-card {
    padding: 0.8rem 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    cursor: pointer;
    transition: background 0.2s;
    animation: intelCardIn 0.3s ease-out;
}
.intel-news-card:hover {
    background: rgba(255,255,255,0.015);
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    border-radius: 6px;
}

@keyframes intelCardIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
}

.intel-news-card-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
}

.intel-news-card-time {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    color: rgba(255,255,255,0.25);
    min-width: 3rem;
}

.intel-news-card-source {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    color: var(--text-muted);
}

.intel-news-card-score {
    font-family: var(--font-mono);
    font-size: 0.62rem;
    font-weight: 700;
    margin-left: auto;
}
.intel-news-card-score--high { color: #4ade80; }
.intel-news-card-score--mid { color: #fbbf24; }
.intel-news-card-score--low { color: #64748b; }

.intel-new-badge {
    font-family: var(--font-mono);
    font-size: 0.5rem;
    font-weight: 700;
    color: #00e85a;
    letter-spacing: 0.08em;
    padding: 1px 5px;
    border-radius: 3px;
    background: rgba(0,232,90,0.1);
}

.intel-news-card-title {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text-main);
    line-height: 1.5;
    margin-bottom: 0.25rem;
    transition: color 0.2s;
}
.intel-news-card:hover .intel-news-card-title { color: #fff; }

.intel-news-card-summary {
    font-size: 0.76rem;
    color: var(--text-muted);
    line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-bottom: 0.35rem;
}

.intel-news-card-tags {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
}
.intel-news-card-tag {
    font-family: var(--font-mono);
    font-size: 0.55rem;
    color: var(--text-muted);
    padding: 1px 6px;
    border-radius: 3px;
    background: rgba(255,255,255,0.04);
}

/* Expanded */
.intel-news-card-expand {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    padding-left: 0.5rem;
    border-left: 2px solid var(--primary);
    animation: intelExpand 0.25s ease-out;
}
.intel-news-card-expand p {
    font-size: 0.82rem;
    color: var(--text-muted);
    line-height: 1.7;
    margin: 0 0 0.5rem;
}
@keyframes intelExpand {
    from { opacity: 0; }
    to { opacity: 1; }
}

.intel-news-card-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--primary);
    text-decoration: none;
    transition: opacity 0.2s;
}
.intel-news-card-link:hover { opacity: 0.8; }

/* ════════════════════════════════════════════════════════════════
   Narratives Panel (from intel-narratives.css)
   ════════════════════════════════════════════════════════════════ */

/* Phase Stats */
.intel-narr-phase-bar {
    display: flex;
    gap: 0.5rem;
    margin: 0.75rem 0;
    flex-wrap: wrap;
}
.intel-narr-phase-stat {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    font-weight: 600;
    padding: 0.3rem 0.7rem;
    border-radius: 6px;
}
.intel-narr-phase-stat--peak { color: #f87171; background: rgba(248,113,113,0.08); }
.intel-narr-phase-stat--rising { color: #fbbf24; background: rgba(251,191,36,0.08); }
.intel-narr-phase-stat--emerging { color: #4ade80; background: rgba(74,222,128,0.08); }
.intel-narr-phase-stat--cooling { color: #94a3b8; background: rgba(148,163,184,0.06); }

/* Filters */
.intel-narr-filters {
    display: flex;
    gap: 0.35rem;
    margin-bottom: 1rem;
}
.intel-narr-filter-btn {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    padding: 0.3rem 0.7rem;
    border: 1px solid var(--glass-border);
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s;
}
.intel-narr-filter-btn:hover { border-color: rgba(255,255,255,0.15); color: var(--text-main); }
.intel-narr-filter-btn.active { border-color: var(--primary); color: var(--primary); background: rgba(192,240,251,0.08); }

/* Grid */
.intel-narr-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
}

/* Narrative Card */
.intel-narr-card {
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 1rem;
    background: var(--glass-bg);
    cursor: pointer;
    transition: all 0.25s ease;
    animation: intelCardIn 0.35s ease-out;
}
.intel-narr-card:hover {
    border-color: rgba(255,255,255,0.12);
    background: var(--glass-bg-hover);
    transform: translateY(-2px);
}

.intel-narr-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}
.intel-narr-card-rank {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 700;
    color: rgba(255,255,255,0.12);
}
.intel-narr-card-badges {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
    justify-content: flex-end;
}

/* Category */
.intel-cat {
    font-family: var(--font-mono);
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 1px 6px;
    border-radius: 3px;
}
.intel-cat--ai { color: #6ecfdb; background: rgba(110,207,219,0.12); }
.intel-cat--web3 { color: #a78bdb; background: rgba(167,139,219,0.12); }
.intel-cat--finance { color: #d4b87a; background: rgba(212,184,122,0.12); }
.intel-cat--default { color: #888; background: rgba(136,136,136,0.12); }

/* Phase */
.intel-phase {
    font-family: var(--font-mono);
    font-size: 0.55rem;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 3px;
}
.intel-phase--emerging { color: #4ade80; background: rgba(74,222,128,0.1); }
.intel-phase--rising { color: #fbbf24; background: rgba(251,191,36,0.1); }
.intel-phase--peak { color: #f87171; background: rgba(248,113,113,0.1); }
.intel-phase--cooling { color: #94a3b8; background: rgba(148,163,184,0.08); }

.intel-narr-signal {
    font-family: var(--font-mono);
    font-size: 0.55rem;
    color: var(--text-muted);
    padding: 1px 5px;
    border-radius: 3px;
    border: 1px solid rgba(255,255,255,0.06);
}

.intel-narr-card-title {
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--text-main);
    line-height: 1.5;
    margin-bottom: 0.4rem;
    transition: color 0.2s;
}
.intel-narr-card:hover .intel-narr-card-title { color: #fff; }

/* Heat */
.intel-narr-card-heat {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 0.5rem;
}
.intel-narr-heat-label {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    color: var(--text-muted);
}
.intel-narr-heat-bar {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: rgba(255,255,255,0.06);
    overflow: hidden;
}
.intel-narr-heat-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.5s ease;
}
.intel-narr-heat--high { background: linear-gradient(90deg, #f87171, #fbbf24); }
.intel-narr-heat--medium { background: linear-gradient(90deg, #fbbf24, #e8d5b7); }
.intel-narr-heat--low { background: linear-gradient(90deg, #94a3b8, #64748b); }

.intel-narr-heat-num {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    font-weight: 700;
    min-width: 1.5rem;
    text-align: right;
}
.intel-narr-heat-num-high { color: #f87171; }
.intel-narr-heat-num-mid { color: #fbbf24; }
.intel-narr-heat-num-low { color: #94a3b8; }

.intel-narr-card-summary {
    font-size: 0.78rem;
    color: var(--text-muted);
    line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-bottom: 0.5rem;
}

.intel-narr-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}
.intel-narr-entities {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
    min-width: 0;
}
.intel-entity-chip {
    font-family: var(--font-mono);
    font-size: 0.55rem;
    color: rgba(232,213,183,0.7);
    padding: 1px 6px;
    border-radius: 3px;
    border: 1px solid rgba(232,213,183,0.15);
    white-space: nowrap;
}
.intel-narr-card-count {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
}

/* Expanded */
.intel-narr-card-expand {
    margin-top: 0.6rem;
    padding-top: 0.6rem;
    border-top: 1px solid rgba(255,255,255,0.06);
}
.intel-narr-card-expand p {
    font-size: 0.82rem;
    color: var(--text-muted);
    line-height: 1.7;
    margin: 0 0 0.6rem;
}
.intel-narr-card-deep {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--primary);
    text-decoration: none;
}
.intel-narr-card-deep i { font-size: 0.65rem; transition: transform 0.2s; }
.intel-narr-card-deep:hover i { transform: translateX(2px); }

/* Blurred locked */
.intel-narr-card--blurred {
    filter: blur(4px);
    opacity: 0.35;
    pointer-events: none;
    user-select: none;
}

/* ════════════════════════════════════════════════════════════════
   Paywall (shared)
   ════════════════════════════════════════════════════════════════ */

.intel-paywall {
    margin-top: 1.25rem;
}
.intel-paywall-inner {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border-radius: 12px;
    border: 1px solid rgba(232,213,183,0.15);
    background: rgba(232,213,183,0.04);
}
.intel-paywall-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba(232,213,183,0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #e8d5b7;
    font-size: 1.1rem;
    flex-shrink: 0;
}
.intel-paywall-text h3 {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text-main);
    margin: 0 0 0.1rem;
}
.intel-paywall-text p {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin: 0;
}
.intel-paywall-btn {
    padding: 0.5rem 1.2rem;
    border-radius: 8px;
    background: linear-gradient(135deg, #e8d5b7, #d4b87a);
    color: #111;
    font-size: 0.78rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: opacity 0.2s;
    flex-shrink: 0;
}
.intel-paywall-btn:hover { opacity: 0.9; }

/* ════════════════════════════════════════════════════════════════
   KOL Placeholder
   ════════════════════════════════════════════════════════════════ */

.intel-placeholder {
    text-align: center;
    padding: 3rem 1rem;
    border: 1px dashed rgba(255,255,255,0.08);
    border-radius: 12px;
    margin-top: 1rem;
    color: #444;
    font-size: 0.85rem;
}

/* ════════════════════════════════════════════════════════════════
   Loading
   ════════════════════════════════════════════════════════════════ */

.intel-loading {
    text-align: center;
    padding: 3rem;
    color: var(--text-muted);
    font-size: 0.85rem;
}

/* ════════════════════════════════════════════════════════════════
   Empty
   ════════════════════════════════════════════════════════════════ */

.intel-empty {
    text-align: center;
    padding: 3rem;
    color: var(--text-muted);
    font-size: 0.85rem;
}

/* ════════════════════════════════════════════════════════════════
   Responsive
   ════════════════════════════════════════════════════════════════ */

@media (max-width: 768px) {
    .intel-main { padding: 0 0.75rem 3rem; }
    .intel-agents { grid-template-columns: repeat(2, 1fr); }
    .intel-header-title { font-size: 1.3rem; }
    .intel-narr-grid { grid-template-columns: 1fr; }
    .intel-news-card:hover { padding-left: 0; padding-right: 0; border-radius: 0; }
    .intel-paywall-inner { flex-direction: column; text-align: center; }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/_styles/intel-main.css
git commit -m "feat: add intel-main.css with agent cards, tabs, news and narratives styles"
```

---

### Task 3: 重写情报站主页

**Files:**
- Rewrite: `app/intel/page.tsx`

将当前 redirect 改为完整的 Tab 切换客户端组件。合并 `app/intel/news/page.tsx` 和 `app/intel/narratives/page.tsx` 的逻辑。

- [ ] **Step 1: 重写 `app/intel/page.tsx`**

替换整个文件内容：

```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthModal } from '@/app/AuthModalContext';
import '@/app/_styles/intel-main.css';

/* ── Types ── */
interface QuickNewsItem {
  id: number;
  title: string;
  source: string;
  summary: string;
  qualityScore: number | null;
  crawlTime: string;
  tags: string[];
  url?: string;
}

interface NarrativeItem {
  id: number;
  title: string;
  summary: string;
  category: string;
  phase: 'Emerging' | 'Rising' | 'Peak' | 'Cooling';
  heatScore: number;
  articleCount: number;
  coreEntities: string[];
  createdAt: string;
  signalStrength: string;
}

interface AgentInfo {
  id: string;
  name: string;
  icon: string;
  status: 'active' | 'idle';
  statusLabel: string;
  processed: number;
  pending: number;
  borderColor: string;
}

interface SummaryInfo {
  total: number;
  processed: number;
  pending: number;
  queued: number;
}

interface UserInfo {
  id: string;
  name: string;
  role: string;
}

type TabKey = 'news' | 'narratives' | 'kol';
type SortMode = 'time' | 'score';
type NarrFilter = 'all' | 'ai' | 'web3' | 'finance';

/* ── Constants ── */
const NEWS_FREE_LIMIT = 20;
const NARR_FREE_LIMIT = 5;

const PHASE_LABEL: Record<string, string> = {
  Emerging: '✨ 萌芽期', Rising: '🔥 上升期', Peak: '⚡ 高峰期', Cooling: '❄️ 冷却期',
};

/* ── Helpers ── */
function formatTime(s: string) {
  return new Date(s).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(s: string) {
  const d = new Date(s);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (itemDate.getTime() === today.getTime()) return '今天';
  if (itemDate.getTime() === yesterday.getTime()) return '昨天';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function isNew(s: string) {
  return Date.now() - new Date(s).getTime() < 3600000;
}

function scoreClass(n: number | null) {
  if (n === null) return 'low';
  if (n >= 7) return 'high';
  if (n >= 4) return 'mid';
  return 'low';
}

function catClass(c: string) {
  const l = c.toLowerCase();
  if (l === 'ai') return 'ai';
  if (l === 'web3') return 'web3';
  if (l === 'finance') return 'finance';
  return 'default';
}

function heatClass(n: number) {
  if (n >= 60) return 'high';
  if (n >= 30) return 'medium';
  return 'low';
}

function heatNumClass(n: number) {
  if (n >= 60) return 'intel-narr-heat-num-high';
  if (n >= 30) return 'intel-narr-heat-num-mid';
  return 'intel-narr-heat-num-low';
}

function signalLabel(s: string | null) {
  if (s === 'strong') return '📡 强信号';
  if (s === 'moderate') return '📶 中信号';
  if (s === 'weak') return '📉 弱信号';
  return '';
}

function isMember(u: UserInfo | null) {
  if (!u) return false;
  return ['junior_member', 'senior_member', 'founder_member', 'admin'].includes(u.role);
}

function groupByDate(items: QuickNewsItem[]) {
  const groups = new Map<string, QuickNewsItem[]>();
  for (const item of items) {
    const label = formatDate(item.crawlTime);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(item);
  }
  return groups;
}

/* ── Page ── */
export default function IntelPage() {
  const [tab, setTab] = useState<TabKey>('news');
  const [loading, setLoading] = useState(true);

  // Data
  const [news, setNews] = useState<QuickNewsItem[]>([]);
  const [narratives, setNarratives] = useState<NarrativeItem[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [summary, setSummary] = useState<SummaryInfo>({ total: 0, processed: 0, pending: 0, queued: 0 });
  const [user, setUser] = useState<UserInfo | null>(null);

  // UI state
  const [sort, setSort] = useState<SortMode>('time');
  const [narrFilter, setNarrFilter] = useState<NarrFilter>('all');
  const [expandedNewsId, setExpandedNewsId] = useState<number | null>(null);
  const [expandedNarrId, setExpandedNarrId] = useState<number | null>(null);

  const { openAuth } = useAuthModal();
  const member = isMember(user);

  useEffect(() => {
    Promise.all([
      fetch('/api/academy/quicknews').then(r => r.json()),
      fetch('/api/academy/narratives').then(r => r.json()),
      fetch('/api/academy/agent-status').then(r => r.json()),
      fetch('/api/auth/me').then(r => r.ok ? r.json() : { user: null }),
    ])
      .then(([newsRes, narrRes, agentRes, authRes]) => {
        setNews(newsRes.data ?? []);
        setNarratives(narrRes.data ?? []);
        setAgents(agentRes.data?.agents ?? []);
        setSummary(agentRes.data?.summary ?? { total: 0, processed: 0, pending: 0, queued: 0 });
        setUser(authRes.user ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="intel-main">
        <div className="intel-loading" style={{ paddingTop: '3rem' }}>正在加载情报…</div>
      </div>
    );
  }

  /* ── News computed ── */
  const sortedNews = sort === 'score'
    ? [...news].sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0))
    : news;
  const visibleNews = member ? sortedNews : sortedNews.slice(0, NEWS_FREE_LIMIT);
  const lockedNewsCount = member ? 0 : Math.max(0, news.length - NEWS_FREE_LIMIT);
  const groupedNews = groupByDate(visibleNews);

  /* ── Narratives computed ── */
  const filteredNarr = narrFilter === 'all' ? narratives : narratives.filter(n => n.category.toLowerCase() === narrFilter);
  const visibleNarr = member ? filteredNarr : filteredNarr.slice(0, NARR_FREE_LIMIT);
  const lockedNarrItems = member ? [] : filteredNarr.slice(NARR_FREE_LIMIT);
  const phaseStats = { Peak: 0, Rising: 0, Emerging: 0, Cooling: 0 };
  narratives.forEach(n => { if (n.phase in phaseStats) phaseStats[n.phase as keyof typeof phaseStats]++; });

  return (
    <div className="intel-main">
      {/* ── Header ── */}
      <div className="intel-header">
        <div className="intel-header-live">
          <div className="intel-header-live-dot" />
          <span className="intel-header-live-label">LIVE · 7×24</span>
        </div>
        <h1 className="intel-header-title">情报中心</h1>
      </div>

      {/* ── Agent Cards ── */}
      <div className="intel-agents">
        {agents.map(agent => {
          const total = agent.processed + agent.pending;
          const pct = total > 0 ? (agent.processed / total) * 100 : 100;
          return (
            <div key={agent.id} className="intel-agent-card">
              <div className="intel-agent-top">
                <div
                  className="intel-agent-avatar"
                  style={{
                    background: `linear-gradient(135deg, ${agent.borderColor}33, ${agent.borderColor}11)`,
                    border: `1px solid ${agent.borderColor}44`,
                  }}
                >
                  {agent.icon}
                </div>
                <div className="intel-agent-info">
                  <div className="intel-agent-name">{agent.name}</div>
                  <div className={`intel-agent-status ${agent.status === 'active' ? 'intel-agent-status--active' : 'intel-agent-status--idle'}`}>
                    {agent.status === 'active' ? '●' : '○'} {agent.statusLabel}
                  </div>
                </div>
              </div>
              <div className="intel-agent-counts">
                <span>已处理 <b>{agent.processed}</b></span>
                <span>待处理 <b className="pending">{agent.pending}</b></span>
              </div>
              <div className="intel-agent-bar">
                <div
                  className="intel-agent-bar-fill"
                  style={{
                    width: `${pct}%`,
                    background: agent.status === 'idle' ? '#444' : `linear-gradient(90deg, ${agent.borderColor}, #00ff88)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Summary Stats ── */}
      <div className="intel-summary">
        <span>今日情报 <b className="total">{summary.total}</b></span>
        <div className="intel-summary-sep" />
        <span>已处理 <b className="processed">{summary.processed}</b></span>
        <div className="intel-summary-sep" />
        <span>待处理 <b className="pending">{summary.pending}</b></span>
        <div className="intel-summary-sep" />
        <span>排队中 <b className="queued">{summary.queued}</b></span>
      </div>

      {/* ── Tabs ── */}
      <div className="intel-tabs">
        <button className={`intel-tab ${tab === 'news' ? 'active' : ''}`} onClick={() => setTab('news')}>
          ⚡ 快讯 <span className="intel-tab-badge">{news.length}</span>
        </button>
        <button className={`intel-tab ${tab === 'narratives' ? 'active' : ''}`} onClick={() => setTab('narratives')}>
          📊 叙事 <span className="intel-tab-badge">{narratives.length}</span>
        </button>
        <button className="intel-tab disabled" disabled>
          👤 KOL追踪 <span className="intel-tab-badge">即将上线</span>
        </button>
      </div>

      {/* ══════════ News Panel ══════════ */}
      <div className={`intel-panel ${tab === 'news' ? 'active' : ''}`}>
        <div className="intel-news-toolbar">
          <span className="intel-news-count">
            {member ? `全部 ${news.length} 条快讯` : `免费浏览 ${visibleNews.length} / ${news.length} 条`}
          </span>
          <div className="intel-news-sort">
            <button className={`intel-news-sort-btn ${sort === 'time' ? 'active' : ''}`} onClick={() => setSort('time')}>按时间</button>
            <button className={`intel-news-sort-btn ${sort === 'score' ? 'active' : ''}`} onClick={() => setSort('score')}>按质量</button>
          </div>
        </div>

        {[...groupedNews.entries()].map(([dateLabel, items]) => (
          <div key={dateLabel}>
            <div className="intel-news-date">{dateLabel}</div>
            {items.map(item => (
              <div
                key={item.id}
                className="intel-news-card"
                onClick={() => {
                  if (!user) { openAuth({ mode: 'login' }); return; }
                  setExpandedNewsId(prev => prev === item.id ? null : item.id);
                }}
              >
                <div className="intel-news-card-meta">
                  {isNew(item.crawlTime) && <span className="intel-new-badge">NEW</span>}
                  <span className="intel-news-card-time">{formatTime(item.crawlTime)}</span>
                  <span className="intel-news-card-source">{item.source}</span>
                  {item.qualityScore !== null && (
                    <span className={`intel-news-card-score intel-news-card-score--${scoreClass(item.qualityScore)}`}>
                      ★ {item.qualityScore}
                    </span>
                  )}
                </div>
                <div className="intel-news-card-title">{item.title}</div>
                <div className="intel-news-card-summary">{item.summary}</div>
                {item.tags.length > 0 && (
                  <div className="intel-news-card-tags">
                    {[...new Set(item.tags)].slice(0, 4).map(tag => (
                      <span key={tag} className="intel-news-card-tag">{tag}</span>
                    ))}
                  </div>
                )}
                {expandedNewsId === item.id && (
                  <div className="intel-news-card-expand">
                    <p>{item.summary}</p>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="intel-news-card-link" onClick={e => e.stopPropagation()}>
                        查看原文 <i className="bi bi-box-arrow-up-right" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {lockedNewsCount > 0 && (
          <div className="intel-paywall">
            <div className="intel-paywall-inner">
              <div className="intel-paywall-icon"><i className="bi bi-lock" /></div>
              <div className="intel-paywall-text">
                <h3>还有 {lockedNewsCount} 条快讯</h3>
                <p>加入学社会员，解锁全部快讯和 AI 深度分析</p>
              </div>
              <button className="intel-paywall-btn" onClick={e => { e.stopPropagation(); openAuth({ mode: 'membership' }); }}>升级会员</button>
            </div>
          </div>
        )}

        {news.length === 0 && <div className="intel-empty">暂无快讯数据</div>}
      </div>

      {/* ══════════ Narratives Panel ══════════ */}
      <div className={`intel-panel ${tab === 'narratives' ? 'active' : ''}`}>
        <div className="intel-narr-phase-bar">
          <span className="intel-narr-phase-stat intel-narr-phase-stat--peak">⚡ 巅峰 {phaseStats.Peak}</span>
          <span className="intel-narr-phase-stat intel-narr-phase-stat--rising">🔥 升温 {phaseStats.Rising}</span>
          <span className="intel-narr-phase-stat intel-narr-phase-stat--emerging">✨ 初现 {phaseStats.Emerging}</span>
          <span className="intel-narr-phase-stat intel-narr-phase-stat--cooling">❄️ 冷却 {phaseStats.Cooling}</span>
        </div>
        <div className="intel-narr-filters">
          {(['all', 'ai', 'web3', 'finance'] as NarrFilter[]).map(c => (
            <button key={c} className={`intel-narr-filter-btn ${narrFilter === c ? 'active' : ''}`} onClick={() => setNarrFilter(c)}>
              {c === 'all' ? '全部' : c === 'ai' ? 'AI' : c === 'web3' ? 'Web3' : '金融'}
            </button>
          ))}
        </div>

        <div className="intel-narr-grid">
          {visibleNarr.map((item, idx) => (
            <div
              key={item.id}
              className="intel-narr-card"
              style={{ animationDelay: `${idx * 0.05}s` }}
              onClick={() => {
                if (!user) { openAuth({ mode: 'login' }); return; }
                setExpandedNarrId(prev => prev === item.id ? null : item.id);
              }}
            >
              <div className="intel-narr-card-top">
                <span className="intel-narr-card-rank">#{String(idx + 1).padStart(2, '0')}</span>
                <div className="intel-narr-card-badges">
                  <span className={`intel-cat intel-cat--${catClass(item.category)}`}>{item.category.toUpperCase()}</span>
                  <span className={`intel-phase intel-phase--${item.phase.toLowerCase()}`}>{PHASE_LABEL[item.phase]}</span>
                  {item.signalStrength && <span className="intel-narr-signal">{signalLabel(item.signalStrength)}</span>}
                </div>
              </div>
              <div className="intel-narr-card-title">{item.title}</div>
              <div className="intel-narr-card-heat">
                <span className="intel-narr-heat-label">热度</span>
                <div className="intel-narr-heat-bar">
                  <div className={`intel-narr-heat-fill intel-narr-heat--${heatClass(item.heatScore)}`} style={{ width: `${item.heatScore}%` }} />
                </div>
                <span className={`intel-narr-heat-num ${heatNumClass(item.heatScore)}`}>{item.heatScore}</span>
              </div>
              <div className="intel-narr-card-summary">{item.summary}</div>
              <div className="intel-narr-card-footer">
                <div className="intel-narr-entities">
                  {item.coreEntities.slice(0, 4).map(e => <span key={e} className="intel-entity-chip">{e}</span>)}
                </div>
                {item.articleCount > 0 && (
                  <span className="intel-narr-card-count"><i className="bi bi-file-earmark-text" /> {item.articleCount}</span>
                )}
              </div>
              {expandedNarrId === item.id && (
                <div className="intel-narr-card-expand">
                  <p>{item.summary}</p>
                  <Link href="/academy/narratives" className="intel-narr-card-deep">
                    在学社中查看完整分析 <i className="bi bi-arrow-right" />
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>

        {lockedNarrItems.length > 0 && (
          <div className="intel-paywall">
            <div className="intel-paywall-inner">
              <div className="intel-paywall-icon"><i className="bi bi-lock" /></div>
              <div className="intel-paywall-text">
                <h3>还有 {lockedNarrItems.length} 条叙事</h3>
                <p>加入学社会员，解锁全部叙事追踪和深度分析</p>
              </div>
              <button className="intel-paywall-btn" onClick={e => { e.stopPropagation(); openAuth({ mode: 'membership' }); }}>升级会员</button>
            </div>
            <div className="intel-narr-grid" style={{ marginTop: '0.75rem' }}>
              {lockedNarrItems.slice(0, 2).map(item => (
                <div key={item.id} className="intel-narr-card intel-narr-card--blurred">
                  <div className="intel-narr-card-title">{item.title}</div>
                  <div className="intel-narr-card-summary">{item.summary}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredNarr.length === 0 && <div className="intel-empty">暂无叙事数据</div>}
      </div>

      {/* ══════════ KOL Placeholder ══════════ */}
      <div className={`intel-panel ${tab === 'kol' ? 'active' : ''}`}>
        <div className="intel-placeholder">🚧 正在构建中，敬请期待</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证页面**

Run: 打开 `http://localhost:5046/intel` 确认页面正常加载，Agent 卡片、Tab 栏、快讯和叙事面板都渲染正确。

- [ ] **Step 3: Commit**

```bash
git add app/intel/page.tsx
git commit -m "feat: rewrite intel page as tab-based layout with agent dashboard"
```

---

### Task 4: 更新导航和首页入口

**Files:**
- Modify: `app/SiteNav.tsx:86-93` (Intel subsite nav)
- Modify: `app/SiteNav.tsx:96-105` (Default nav)
- Modify: `app/page.tsx:92-102` (Homepage entry buttons)

- [ ] **Step 1: 修改 SiteNav — Intel 子站导航**

将 `app/SiteNav.tsx` 中 Intel 子站导航部分（约第 86-93 行）替换为单个"情报站"链接：

```tsx
{/* ── Intel subsite navigation ── */}
{isIntel && (
  <>
    <Link href="/intel" className="nav-link" style={{ color: '#00d4ff' }}>情报站</Link>
    <Link href="/academy/narratives" className="nav-link academy-link">学社</Link>
    <NavAuthButton />
  </>
)}
```

- [ ] **Step 2: 修改 SiteNav — 默认导航**

将默认导航中的两个情报站链接（约第 96-105 行）替换为单个链接：

```tsx
{/* ── Default navigation (brand home, auth pages, profile, etc.) ── */}
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

- [ ] **Step 3: 修改首页入口按钮**

将 `app/page.tsx` 中的两个情报站按钮（约第 92-102 行）替换为单个按钮：

```tsx
<Link href="/intel" className="brand-entry-btn brand-entry-btn--intel">
    <i className="bi bi-broadcast" />
    <span>情报站</span>
    <i className="bi bi-arrow-right brand-entry-btn-arrow" />
</Link>
```

- [ ] **Step 4: 验证导航**

打开浏览器检查：
1. 首页 `http://localhost:5046/` 有"情报站"入口按钮
2. `/intel` 页面导航栏显示"情报站"链接
3. 非情报站页面导航栏显示"情报站"链接指向 `/intel`

- [ ] **Step 5: Commit**

```bash
git add app/SiteNav.tsx app/page.tsx
git commit -m "refactor: unify intel nav to single link"
```

---

### Task 5: 清理旧文件

**Files:**
- Delete: `app/intel/news/page.tsx`
- Delete: `app/intel/narratives/page.tsx`
- Delete: `app/_styles/intel-news.css`
- Delete: `app/_styles/intel-narratives.css`
- Delete: `app/intel/news/` directory
- Delete: `app/intel/narratives/` directory

- [ ] **Step 1: 确认旧文件不再被引用**

Run: `grep -r "intel-news\|intel-narratives\|intel-news\.css\|intel-narratives\.css" --include="*.tsx" --include="*.ts" app/ lib/`
Expected: 无结果（旧 CSS 和页面都已不被引用）

- [ ] **Step 2: 删除旧文件和目录**

```bash
rm app/intel/news/page.tsx
rmdir app/intel/news
rm app/intel/narratives/page.tsx
rmdir app/intel/narratives
rm app/_styles/intel-news.css
rm app/_styles/intel-narratives.css
```

- [ ] **Step 3: 验证构建**

Run: `npm run build`
Expected: 构建成功，无缺失模块错误

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old intel/news and intel/narratives pages and CSS"
```

---

### Task 6: SEO 元数据

**Files:**
- Modify: `app/intel/page.tsx` (需要拆分为 layout + page 或内联 metadata)

由于 `app/intel/page.tsx` 是 `'use client'`，无法直接 export metadata。需要通过 layout 或拆分路由提供 metadata。

- [ ] **Step 1: 创建 `app/intel/layout.tsx`**

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '情报中心 - 知更鸟',
  description: 'AI 智能体团队 7×24 为你追踪有价值的信号',
};

export default function IntelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/intel/layout.tsx
git commit -m "feat: add intel layout with SEO metadata"
```

---

## Verification Checklist

- [ ] `/intel` 加载 Tab 切换主页，默认显示快讯 Tab
- [ ] Agent 卡片展示 4 个智能体状态（头像、名称、状态、进度条）
- [ ] 统计汇总条显示总数、已处理、待处理、排队
- [ ] Tab 切换正常：快讯 / 叙事 / KOL(灰色)
- [ ] 快讯 Tab：按日期分组、质量评分、NEW 标记、展开详情
- [ ] 叙事 Tab：阶段统计、分类筛选、双列卡片网格、热度条
- [ ] 付费墙：未登录用户免费浏览有限条目，点击升级弹出会员模态
- [ ] 导航栏：Intel 子站只有"情报站"链接
- [ ] 首页：只有"情报站"入口按钮
- [ ] `/intel/news` 和 `/intel/narratives` 已删除，返回 404
- [ ] 移动端：Agent 卡片 2x2 网格，Tab 横向滚动
- [ ] `npm run build` 通过
