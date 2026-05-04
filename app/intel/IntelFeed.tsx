'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthModal } from '@/app/AuthModalContext';

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
    const { openAuth } = useAuthModal();

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
            openAuth({ mode: 'login' });
            return;
        }
        setExpandedId(prev => prev === item.id ? null : item.id);
    }, [user, openAuth]);

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
