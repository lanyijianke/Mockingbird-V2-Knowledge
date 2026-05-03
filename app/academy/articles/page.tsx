'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

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
  tags: string[];
  url: string;
  images: string[];
}

function formatRelativeTime(dt: string): string {
  if (!dt) return '';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '';
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const tagStyle = (tag: string): string => {
  const t = tag.toLowerCase();
  if (t === 'web3') return 'web3';
  if (t === 'ai') return 'ai';
  if (t === 'finance') return 'finance';
  return 'other';
};

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

type CategoryTab = 'all' | 'Web3' | 'AI' | 'Finance';

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryTab>('all');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  // Pagination
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const limit = 15;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const dateGroups = useMemo(() => {
    const groupMap = new Map<string, Article[]>();
    for (const article of articles) {
      const key = getDateKey(article.ingestedAt || article.crawlTime);
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(article);
    }
    const groups: { dateKey: string; label: string; items: Article[] }[] = [];
    for (const [key, groupItems] of groupMap) {
      groups.push({ dateKey: key, label: getDateLabel(key), items: groupItems });
    }
    return groups;
  }, [articles]);

  const buildUrl = useCallback((off: number) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(off) });
    if (category !== 'all') params.set('category', category);
    if (search.trim()) params.set('search', search.trim());
    return `/api/academy/articles?${params}`;
  }, [category, search]);

  const loadData = useCallback(async (reset = true) => {
    if (reset) {
      setLoading(true);
      setArticles([]);
    }
    setError(null);
    try {
      const url = buildUrl(0);
      const res = await fetch(url).then(r => r.json());
      if (res.success) {
        setArticles(res.data);
        setTotal(res.total);
        setOffset(res.data.length);
      } else {
        setError(res.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const url = buildUrl(offset);
      const res = await fetch(url).then(r => r.json());
      if (res.success) {
        setArticles(prev => [...prev, ...res.data]);
        setOffset(prev => prev + res.data.length);
        setTotal(res.total);
      }
    } catch { /* ignore */ }
    setLoadingMore(false);
  }, [buildUrl, offset, loadingMore]);

  // Initial load
  useEffect(() => { loadData(); }, [category]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => loadData(), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!sentinelRef.current) return;

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && articles.length < total) {
        loadMore();
      }
    }, { rootMargin: '200px' });

    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [articles.length, total, loadMore]);

  const hasMore = articles.length < total;

  if (loading) return <div className="articles-wrap"><div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>加载中...</div></div>;
  if (error) return <div className="articles-wrap"><div style={{ padding: '3rem', textAlign: 'center', color: '#f87171' }}>{error}</div></div>;

  return (
    <div className="articles-wrap">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">精读文章</h1>
            <p className="page-desc">经 AI 筛选、分类、评分的高质量深度文章。每篇附 AI 评价与入选理由，只留值得精读的好文。</p>
          </div>
          <div className="live-stats">
            <span className="live-dot" />
            共 <span className="live-stats-count">{total}</span> 篇
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        {(['all', 'AI', 'Web3', 'Finance'] as CategoryTab[]).map(tab => (
          <button
            key={tab}
            className={`filter-tab ${category === tab ? 'active' : ''}`}
            onClick={() => setCategory(tab)}
          >
            {tab === 'all' ? <><span className="tab-dot all" />全部</> : <><span className={`tab-dot ${tab.toLowerCase()}`} />{tab}</>}
          </button>
        ))}
        <div className="filter-right">
          <div className="search-wrap open">
            <input
              className="search-input"
              type="text"
              placeholder="搜索文章..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '180px' }}
            />
          </div>
        </div>
      </div>

      {/* Article Cards grouped by date */}
      {dateGroups.map(group => (
        <div key={group.dateKey}>
          <div className="date-separator">
            <span className="date-separator-text">{group.label}</span>
            <div className="date-separator-line" />
          </div>
          <div className="article-card-list">
            {group.items.map((article, idx) => (
              <div
                key={article.id}
                className="article-card-item"
                style={{ animationDelay: `${Math.min(idx, 17) * 0.03}s` }}
              >
                {/* Header: source, author, time, score */}
                <div className="article-card-header">
                  <div className="article-card-meta">
                    <span className="article-source-badge">{article.source}</span>
                    {article.author && <span className="article-card-author">{article.author}</span>}
                    <span className="article-card-time">{formatRelativeTime(article.ingestedAt || article.crawlTime)}</span>
                  </div>
                  {article.qualityScore !== null && (
                    <span className={`article-card-score ${(article.qualityScore ?? 0) >= 7 ? 'high' : (article.qualityScore ?? 0) >= 4 ? 'mid' : 'low'}`}>
                      <i className="bi bi-star" /> {Number(article.qualityScore).toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h2 className="article-card-title">{article.title}</h2>

                {/* AI Reasoning */}
                {article.aiReasoning && (
                  <div className="article-card-reasoning">
                    <i className="bi bi-lightbulb" /> {article.aiReasoning}
                  </div>
                )}

                {/* Content Preview */}
                {article.preview && (
                  <div className="article-card-preview">{article.preview}</div>
                )}

                {/* Images */}
                {article.images.length > 0 && (
                  <div className="article-card-images">
                    {article.images.map((img, i) => (
                      <img key={i} src={img} alt="" className="article-card-img" loading="lazy" />
                    ))}
                  </div>
                )}

                {/* Footer: tags, links */}
                <div className="article-card-footer">
                  <div className="article-card-tags">
                    {article.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className={`article-card-tag ${tagStyle(tag)}`}>{tag}</span>
                    ))}
                  </div>
                  <div className="article-card-links">
                    {article.url && (
                      <a href={article.url} target="_blank" rel="noopener noreferrer" className="article-card-ext">
                        查看原文 <i className="bi bi-box-arrow-up-right" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {articles.length === 0 && (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
          暂无精读文章
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && <div ref={sentinelRef} style={{ height: '1px' }} />}
      {loadingMore && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          加载更多文章...
        </div>
      )}
      {!hasMore && articles.length > 0 && (
        <div className="scroll-sentinel"><span>已加载全部文章</span></div>
      )}
    </div>
  );
}
