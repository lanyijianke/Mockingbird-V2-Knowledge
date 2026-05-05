'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthModal } from '@/app/AuthModalContext';
import '@/app/_styles/intel-main.css';

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
type NarrFilter = 'all' | 'ai' | 'finance' | 'global';

const NEWS_FREE_LIMIT = 20;
const NARR_FREE_LIMIT = 5;

const PHASE_LABEL: Record<string, string> = {
  Emerging: '萌芽', Rising: '升温', Peak: '高峰', Cooling: '冷却',
};

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

function isNew(s: string) { return Date.now() - new Date(s).getTime() < 3600000; }

function catClass(domain: string) {
  if (domain === 'ai') return 'ai';
  if (domain === 'finance') return 'finance';
  if (domain === 'global') return 'global';
  return 'default';
}

function heatClass(n: number) {
  if (n >= 60) return 'high';
  if (n >= 30) return 'medium';
  return 'low';
}

function signalLabel(s: string | null) {
  if (s === 'strong') return '强信号';
  if (s === 'moderate') return '中信号';
  if (s === 'weak') return '弱信号';
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

export default function IntelPage() {
  const [tab, setTab] = useState<TabKey>('news');
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState<QuickNewsItem[]>([]);
  const [narratives, setNarratives] = useState<NarrativeItem[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [summary, setSummary] = useState<SummaryInfo>({ total: 0, processed: 0, pending: 0, queued: 0 });
  const [user, setUser] = useState<UserInfo | null>(null);
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
        <div className="intel-loading" style={{ paddingTop: '3rem' }}>LOADING...</div>
      </div>
    );
  }

  const sortedNews = sort === 'score'
    ? [...news].sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0))
    : news;
  const visibleNews = member ? sortedNews : sortedNews.slice(0, NEWS_FREE_LIMIT);
  const lockedNewsCount = member ? 0 : Math.max(0, news.length - NEWS_FREE_LIMIT);
  const groupedNews = groupByDate(visibleNews);

  const filteredNarr = narrFilter === 'all' ? narratives : narratives.filter(n => n.domain === narrFilter);
  const visibleNarr = member ? filteredNarr : filteredNarr.slice(0, NARR_FREE_LIMIT);
  const lockedNarrItems = member ? [] : filteredNarr.slice(NARR_FREE_LIMIT);

  return (
    <div className="intel-main">
      <div className="intel-header">
        <div className="intel-header-live">
          <div className="intel-header-live-dot" />
          <span className="intel-header-live-label">LIVE · 7×24</span>
        </div>
        <h1 className="intel-header-title">INTEL CENTER</h1>
      </div>

      <div className="intel-agents">
        {agents.map(agent => {
          const total = agent.processed + agent.pending;
          const pct = total > 0 ? (agent.processed / total) * 100 : 100;
          return (
            <div key={agent.id} className="intel-agent-card">
              <div className="intel-agent-top">
                <i className={`intel-agent-icon bi ${agent.icon}`} />
                <div className="intel-agent-info">
                  <div className="intel-agent-name">{agent.name}</div>
                  <div className={`intel-agent-status ${agent.status === 'active' ? 'intel-agent-status--active' : 'intel-agent-status--idle'}`}>
                    {agent.status === 'active' ? '■' : '□'} {agent.statusLabel}
                  </div>
                </div>
              </div>
              <div className="intel-agent-counts">
                <span>已处理 <b>{agent.processed}</b></span>
                <span>待处理 <b>{agent.pending}</b></span>
              </div>
              <div className="intel-agent-bar">
                <div className="intel-agent-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="intel-summary">
        <span>今日情报 <b>{summary.total}</b></span>
        <div className="intel-summary-sep" />
        <span>已处理 <b>{summary.processed}</b></span>
        <div className="intel-summary-sep" />
        <span>待处理 <b>{summary.pending}</b></span>
        <div className="intel-summary-sep" />
        <span>排队中 <b>{summary.queued}</b></span>
      </div>

      <div className="intel-tabs">
        <button className={`intel-tab ${tab === 'news' ? 'active' : ''}`} onClick={() => setTab('news')}>
          快讯 <span className="intel-tab-badge">{news.length}</span>
        </button>
        <button className={`intel-tab ${tab === 'narratives' ? 'active' : ''}`} onClick={() => setTab('narratives')}>
          叙事 <span className="intel-tab-badge">{narratives.length}</span>
        </button>
        <button className="intel-tab disabled" disabled>
          KOL追踪 <span className="intel-tab-badge">SOON</span>
        </button>
      </div>

      {/* News Panel */}
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
              <div key={item.id} className="intel-news-card" onClick={() => {
                if (!user) { openAuth({ mode: 'login' }); return; }
                setExpandedNewsId(prev => prev === item.id ? null : item.id);
              }}>
                <div className="intel-news-card-meta">
                  {isNew(item.crawlTime) && <span className="intel-new-badge">NEW</span>}
                  <span className="intel-news-card-time">{formatTime(item.crawlTime)}</span>
                  <span className="intel-news-card-source">{item.source}</span>
                  {item.qualityScore !== null && (
                    <span className="intel-news-card-score">{item.qualityScore}</span>
                  )}
                </div>
                <div className="intel-news-card-title">{item.title}</div>
                <div className="intel-news-card-summary">{item.summary}</div>
                {(item.categoryPath || item.tags.length > 0) && (
                  <div className="intel-news-card-tags">
                    {item.categoryPath ? (() => {
                      const parts = item.categoryPath.split('/').filter(Boolean);
                      return parts.map((part, i) => (
                        <span key={i}>
                          {i === 0 ? (
                            <span className={`intel-cat intel-cat--${catClass(item.domain)}`}>{part}</span>
                          ) : (
                            <span className={`intel-subcat ${item.domain}`}>{part}</span>
                          )}
                        </span>
                      ));
                    })() : [...new Set(item.tags)].slice(0, 4).map(tag => (
                      <span key={tag} className="intel-news-card-tag">{tag}</span>
                    ))}
                  </div>
                )}
                {expandedNewsId === item.id && (
                  <div className="intel-news-card-expand">
                    <p>{item.summary}</p>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="intel-news-card-link" onClick={e => e.stopPropagation()}>
                        查看原文 <i className="bi bi-arrow-up-right" />
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

      {/* Narratives Panel */}
      <div className={`intel-panel ${tab === 'narratives' ? 'active' : ''}`}>
        <div className="intel-narr-filters">
          {(['all', 'ai', 'finance', 'global'] as NarrFilter[]).map(c => (
            <button key={c} className={`intel-narr-filter-btn ${narrFilter === c ? 'active' : ''}`} onClick={() => setNarrFilter(c)}>
              {c === 'all' ? '全部' : c === 'ai' ? 'AI' : c === 'finance' ? '金融' : 'Global'}
            </button>
          ))}
        </div>

        <div className="intel-narr-grid">
          {visibleNarr.map((item, idx) => (
            <div key={item.id} className="intel-narr-card" style={{ animationDelay: `${idx * 0.05}s` }} onClick={() => {
              if (!user) { openAuth({ mode: 'login' }); return; }
              setExpandedNarrId(prev => prev === item.id ? null : item.id);
            }}>
              <div className="intel-narr-card-top">
                <span className="intel-narr-card-rank">#{String(idx + 1).padStart(2, '0')}</span>
                <div className="intel-narr-card-badges">
                  <span className={`intel-cat intel-cat--${catClass(item.domain)}`}>{(item.categoryPath.split('/')[0] || item.category).toUpperCase()}</span>
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
                <span className="intel-narr-heat-num">{item.heatScore}</span>
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

      {/* KOL Placeholder */}
      <div className={`intel-panel ${tab === 'kol' ? 'active' : ''}`}>
        <div className="intel-placeholder">正在构建中，敬请期待</div>
      </div>
    </div>
  );
}
