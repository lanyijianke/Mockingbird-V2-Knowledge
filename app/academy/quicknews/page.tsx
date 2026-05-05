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
