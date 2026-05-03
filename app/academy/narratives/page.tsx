'use client';

import { useState, useEffect, useCallback } from 'react';

// ═══ Types ═══
interface Contra {
  title: string; text: string; level: 'high' | 'med' | 'low';
  source: string; credLevel: 'high' | 'med'; credScore: number;
}
interface Insight {
  type: 'risk' | 'opp'; score: number; title: string;
  preview: string; full: string;
}
interface Article {
  id: number; source: string; quality: 'high' | 'med'; qualityScore: number;
  title: string; summary: string; publishedAt: string; author: string;
  reasoning: string; content: string;
}
interface Event {
  date: string; type: string; typeName: string; name: string;
  desc: string; tags: string[]; sourceCount: number;
  confidence: number; ongoing: boolean; cause?: string;
}
interface NarrativeListItem {
  id: number; rank: number; title: string; category: string;
  phase: string; heatScore: number; articleCount: number;
  signalStrength: string | null; coreEntities: string[];
  summary: string; createdAt: string;
}
interface NarrativeDetail {
  id: number; title: string; category: string;
  phase: string; heatScore: number; articleCount: number;
  signalStrength: string | null; coreEntities: string[];
  summary: string; body: string;
  contradictions: Contra[]; insights: Insight[];
  articles: Article[]; events: Event[];
}

// ═══ Helpers ═══
const phaseClass = (p: string) => 'phase-' + p.toLowerCase();
const phaseLabel = (p: string) => ({ Emerging: '✨ 初现', Rising: '🔥 升温', Peak: '⚡ 巅峰', Cooling: '❄️ 冷却' })[p] ?? p;
const signalLabel = (s: string | null) => ({ strong: '📡 强', moderate: '📶 中', weak: '📉 弱' })[s ?? ''] ?? '';
const signalPhase = (s: string) => s === 'strong' ? 'peak' : s === 'moderate' ? 'rising' : 'cooling';

function heatColor(s: number) {
  if (s >= 80) return '#f87171';
  if (s >= 60) return '#fbbf24';
  if (s >= 40) return 'var(--academy-gold)';
  if (s >= 20) return '#94a3b8';
  return '#64748b';
}
function heatGradient(s: number) {
  if (s >= 80) return 'linear-gradient(90deg, #f87171, #fca5a5)';
  if (s >= 60) return 'linear-gradient(90deg, #fbbf24, #fcd34d)';
  if (s >= 40) return 'linear-gradient(90deg, #E8D5B7, #F5EDE3)';
  if (s >= 20) return 'linear-gradient(90deg, #94a3b8, #cbd5e1)';
  return 'linear-gradient(90deg, #64748b, #94a3b8)';
}

// ═══ Component ═══
export default function NarrativesPage() {
  const [list, setList] = useState<NarrativeListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<NarrativeDetail | null>(null);
  const [filter, setFilter] = useState('all');
  const [expandedInsights, setExpandedInsights] = useState<Set<number>>(new Set());
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch narrative list
  useEffect(() => {
    fetch('/api/academy/narratives')
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setList(res.data);
          if (res.data.length > 0) setSelectedId(res.data[0].id);
        } else {
          setError(res.error || '加载失败');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Fetch narrative detail when selection changes
  const fetchDetail = useCallback(async (id: number) => {
    setSelectedArticleId(null);
    setExpandedInsights(new Set());
    try {
      const res = await fetch(`/api/academy/narratives/${id}`);
      const json = await res.json();
      if (json.success) setDetail(json.data);
      else setError(json.error);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载详情失败');
    }
  }, []);

  useEffect(() => {
    if (selectedId !== null) fetchDetail(selectedId);
  }, [selectedId, fetchDetail]);

  const filtered = filter === 'all' ? list : list.filter(n => n.category === filter);

  // Phase stats from list
  const phaseStats = { Peak: 0, Rising: 0, Emerging: 0, Cooling: 0 };
  list.forEach(n => { if (n.phase in phaseStats) phaseStats[n.phase as keyof typeof phaseStats]++; });

  if (loading) return <div className="academy-main"><div className="narrative-detail-pane"><div className="detail-empty"><div className="detail-empty-icon"><i className="bi bi-arrow-repeat" /></div><h3>加载中...</h3></div></div></div>;

  if (error && list.length === 0) return <div className="academy-main"><div className="narrative-detail-pane"><div className="detail-empty"><div className="detail-empty-icon"><i className="bi bi-exclamation-triangle" /></div><h3>加载失败</h3><p>{error}</p></div></div></div>;

  return (
    <div className="academy-main">
      {/* ─── Left: List ─── */}
      <div className="narrative-list-pane">
        <div className="narrative-list-header">
          <div className="narrative-list-title">热门叙事</div>
          <div className="narrative-filters">
            {['all', 'ai', 'web3', 'finance'].map(cat => (
              <button key={cat} className={`narr-filter-btn ${filter === cat ? 'active' : ''}`} onClick={() => setFilter(cat)}>
                {cat === 'all' ? '全部' : cat === 'ai' ? 'AI' : cat === 'web3' ? 'Web3' : '金融'}
              </button>
            ))}
          </div>
          <div className="phase-stats-row">
            <span className="phase-chip peak">⚡ 巅峰 {phaseStats.Peak}</span>
            <span className="phase-chip rising">🔥 升温 {phaseStats.Rising}</span>
            <span className="phase-chip emerging">✨ 初现 {phaseStats.Emerging}</span>
            <span className="phase-chip cooling">❄️ 冷却 {phaseStats.Cooling}</span>
          </div>
        </div>
        <div className="narrative-list-scroll">
          {filtered.map(n => (
            <div key={n.id} className={`narr-item ${n.id === selectedId ? 'active' : ''}`} onClick={() => setSelectedId(n.id)}>
              <div className="narr-item-top">
                <div className="narr-item-badges">
                  <span className={`narr-cat ${n.category}`}>{n.category.toUpperCase()}</span>
                  <span className={`narr-phase ${phaseClass(n.phase)}`}>{phaseLabel(n.phase)}</span>
                  {n.signalStrength && <span className={`narr-phase ${signalPhase(n.signalStrength)}`}>{signalLabel(n.signalStrength)}</span>}
                </div>
                <span className="narr-rank">{String(n.rank).padStart(2, '0')}</span>
              </div>
              <div className="narr-item-title">{n.title}</div>
              <div className="narr-item-preview">{n.summary}</div>
              <div className="narr-heat-row">
                <span className="narr-heat-label">热度</span>
                <div className="narr-heat-track">
                  <div className="narr-heat-fill" style={{ width: `${n.heatScore}%`, background: heatGradient(n.heatScore) }} />
                </div>
                <span className="narr-heat-score" style={{ color: heatColor(n.heatScore) }}>{n.heatScore}</span>
              </div>
              <div className="narr-item-footer">
                <span><i className="bi bi-file-earmark-text" /> {n.articleCount} 篇</span>
                {n.coreEntities.slice(0, 3).map(e => <span key={e} className="narr-entity-chip">{e}</span>)}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>暂无叙事数据</div>}
        </div>
      </div>

      {/* ─── Right: Detail ─── */}
      <div className="narrative-detail-pane" key={selectedId ?? 0}>
        {detail ? (
          <>
            {/* Title */}
            <div className="detail-header">
              <h1 className="detail-title">{detail.title}</h1>
            </div>

            {/* Body */}
            {detail.body && (
              <div className="nd-section">
                <div className="section-label"><i className="bi bi-diagram-3" /> 叙事推理链</div>
                <div className="nd-body-text">{detail.body}</div>
              </div>
            )}

            {/* Contradictions + Insights */}
            {(detail.contradictions.length > 0 || detail.insights.length > 0) && (
              <div className="nd-section">
                <div className="two-col">
                  <div>
                    {detail.contradictions.length > 0 && (
                      <>
                        <div className="section-label"><i className="bi bi-lightning-charge" /> 矛盾信号</div>
                        {detail.contradictions.map((c, i) => (
                          <div key={i} className={`contra-card ${c.level}`}>
                            <div className="contra-title">{c.title}</div>
                            <div className="contra-text">{c.text}</div>
                            <div className="contra-meta">
                              <span>{c.source}</span>
                              <span className={`cred-badge ${c.credLevel}`}>可信度 {c.credScore}</span>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                  <div>
                    {detail.insights.length > 0 && (
                      <>
                        <div className="section-label"><i className="bi bi-eye" /> 二阶洞察</div>
                        {detail.insights.map((ins, i) => {
                          const expanded = expandedInsights.has(i);
                          const icon = ins.type === 'risk' ? '⚠' : '✦';
                          const scoreColor = ins.type === 'risk' ? (ins.score >= 70 ? '#f87171' : '#fbbf24') : '#4ade80';
                          return (
                            <div key={i} className={`insight-card ${ins.type} ${expanded ? 'expanded' : ''}`} onClick={() => {
                              setExpandedInsights(prev => { const next = new Set(prev); if (next.has(i)) next.delete(i); else next.add(i); return next; });
                            }}>
                              <div className="insight-top">
                                <span className={`insight-type ${ins.type}`}>{ins.type === 'risk' ? 'RISK' : 'OPPORTUNITY'}</span>
                                <span className="insight-score" style={{ color: scoreColor }}>{icon} {ins.score}</span>
                              </div>
                              <div className="insight-title">{ins.title}</div>
                              <div className="insight-preview">{ins.preview}</div>
                              <div className="insight-full">{ins.full}</div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Articles */}
            {detail.articles.length > 0 && (
              <div className="nd-section">
                <div className="section-label"><i className="bi bi-file-earmark-text" /> 关联文章</div>
                <div className="articles-grid">
                  {detail.articles.map(a => (
                    <div key={a.id} className={`article-card ${selectedArticleId === a.id ? 'selected' : ''}`} onClick={() => setSelectedArticleId(a.id)}>
                      <div className="article-source-row">
                        <span className="article-source">{a.source}</span>
                        <span className={`article-quality ${a.quality}`}>Q {a.qualityScore}</span>
                      </div>
                      <div className="article-title">{a.title}</div>
                      <div className="article-summary">{a.summary}</div>
                      <div className="article-time">{a.publishedAt}</div>
                    </div>
                  ))}
                </div>

                {selectedArticleId !== null && (() => {
                  const a = detail.articles.find(x => x.id === selectedArticleId);
                  if (!a) return null;
                  return (
                    <div className="article-reader open">
                      <div className="reader-header">
                        <div className="reader-meta">
                          <span><i className="bi bi-newspaper" /> {a.source}</span>
                          <span><i className="bi bi-calendar3" /> {a.publishedAt}</span>
                          {a.author && <span><i className="bi bi-person" /> {a.author}</span>}
                        </div>
                        <div className="reader-actions">
                          <button className="reader-btn" onClick={() => setSelectedArticleId(null)}><i className="bi bi-x-lg" /> 关闭</button>
                        </div>
                      </div>
                      <div className="reader-title">{a.title}</div>
                      {a.reasoning && (
                        <div className="reader-section">
                          <div className="reader-section-label">AI 推理</div>
                          <div className="reader-reasoning">{a.reasoning}</div>
                        </div>
                      )}
                      <div className="reader-section">
                        <div className="reader-section-label">全文</div>
                        <div className="reader-body">{a.content.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Timeline */}
            {detail.events.length > 0 && (
              <div className="nd-section">
                <div className="section-label"><i className="bi bi-diagram-2" /> 事件脉络</div>
                <div className="lineage-stats">
                  <span><strong>{detail.events.length}</strong> 事件节点</span>
                  <span><strong>{detail.events.filter(e => e.cause).length}</strong> 因果链</span>
                  <span><strong>{detail.coreEntities.length}</strong> 参与实体</span>
                  <span><strong>{detail.articleCount}</strong> 情报源</span>
                </div>
                <div className="timeline">
                  {detail.events.map((e, i) => (
                    <div key={i}>
                      {i > 0 && e.cause && <div className="causal-link">{e.cause}</div>}
                      <div className="event-node">
                        <div className={`event-dot ${e.ongoing ? 'pulse' : ''}`} />
                        <div className="event-top">
                          <span className="event-date">{e.date}</span>
                          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                            {e.ongoing && <span className="event-ongoing">进行中</span>}
                            <span className={`event-type ${e.type}`}>{e.typeName}</span>
                          </div>
                        </div>
                        <div className="event-name">{e.name}</div>
                        <div className="event-desc">{e.desc}</div>
                        {e.tags.length > 0 && <div className="event-tags">{e.tags.map(t => <span key={t} className="event-tag">{t}</span>)}</div>}
                        <div className="event-stats"><span>置信度 {e.confidence}%</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="detail-empty">
            <i className="bi bi-fire detail-empty-icon" />
            <h3>选择一条叙事</h3>
            <p>点击左侧列表查看叙事详情</p>
          </div>
        )}
      </div>
    </div>
  );
}
