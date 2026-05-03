'use client';

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
  category?: string;
}

function inferCategory(title: string): string | null {
  const t = title.toLowerCase();
  if (/ai|模型|llm|gpt|claude|gemini|openai|deepmind|llama|大模型|豆包|文心|端侧|mistral|pixtral|nvidia/.test(t)) return 'ai';
  if (/比特币|以太坊|defi|web3|solana|etf|crypto|uniswap|vitalik|币|链|token|nft|区块链|circle|hooks|pectra/.test(t)) return 'web3';
  if (/美联储|降息|pmi|股市|日元|黄金|港股|a股|英伟达|财报|加息|通胀|利率|宏观|中芯|算力|美联储|fomc/.test(t)) return 'finance';
  return null;
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

export default function QuickNewsPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sortMode, setSortMode] = useState<SortMode>('time');
  const [sortOpen, setSortOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/academy/quicknews')
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          const enriched = res.data.map((item: FeedItem) => ({
            ...item,
            category: inferCategory(item.title) || undefined,
          }));
          setItems(enriched);
        } else {
          setError(res.error);
        }
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

  const filteredItems = useMemo(() => {
    let result = items;

    if (activeCategory !== 'all') {
      result = result.filter(item => item.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item =>
        item.title.toLowerCase().includes(q) ||
        (item.summary || '').toLowerCase().includes(q)
      );
    }

    if (sortMode === 'score') {
      result = [...result].sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
    }

    return result;
  }, [items, activeCategory, searchQuery, sortMode]);

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
        <button className={`filter-tab ${activeCategory === 'all' ? 'active' : ''}`} onClick={() => setActiveCategory('all')}>
          <span className="tab-dot all" />全部
        </button>
        <button className={`filter-tab ${activeCategory === 'ai' ? 'active' : ''}`} onClick={() => setActiveCategory('ai')}>
          <span className="tab-dot ai" />AI
        </button>
        <button className={`filter-tab ${activeCategory === 'web3' ? 'active' : ''}`} onClick={() => setActiveCategory('web3')}>
          <span className="tab-dot web3" />Web3
        </button>
        <button className={`filter-tab ${activeCategory === 'finance' ? 'active' : ''}`} onClick={() => setActiveCategory('finance')}>
          <span className="tab-dot finance" />Finance
        </button>
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
                      {item.category && <span className={`feed-cat ${item.category}`}>{item.category.toUpperCase()}</span>}
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
                    {isExpanded && item.summary && (
                      <div className="feed-detail">
                        <div className="feed-detail-text">{item.summary}</div>
                        <div className="feed-detail-actions">
                          <span><i className="bi bi-clock" /> {time}</span>
                          <span><i className="bi bi-arrow-repeat" /> {item.source}</span>
                        </div>
                      </div>
                    )}
                    {item.qualityScore !== null && (
                      <span className="feed-score"><i className="bi bi-star" /> {Number(item.qualityScore).toFixed(1)}</span>
                    )}
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
