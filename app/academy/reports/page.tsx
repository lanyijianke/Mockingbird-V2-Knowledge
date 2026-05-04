'use client';

import './reports.css';
import { useState, useEffect, useCallback } from 'react';

interface Report {
  id: number;
  title: string;
  category: string;
  summary: string;
  articleCount: number;
  narrativeCount: number;
  createdAt: string;
}

interface ReportDetail {
  id: number;
  title: string;
  category: string;
  createdAt: string;
  articleCount: number;
  narrativeCount: number;
  executiveSummary: string;
  signalSummary: {
    objectiveSignalStrength?: number;
    evidenceCount?: number;
    sourceDiversity?: number;
    description?: string;
  } | null;
  sections: { title: string; body: string }[] | null;
  trendChanges: { metric: string; previous: string; current: string; direction: string; significance: string }[] | null;
}

function formatDate(dt: string): string {
  if (!dt) return '';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatFullDate(dt: string): string {
  if (!dt) return '';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const actionMap: Record<string, { icon: string; label: string; cls: string }> = {
  ai: { icon: 'bi-eye', label: '持续关注', cls: 'monitor' },
  web3: { icon: 'bi-eye', label: '持续关注', cls: 'monitor' },
  finance: { icon: 'bi-exclamation-triangle', label: '立即行动', cls: 'act' },
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Detail state
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch('/api/academy/reports')
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setReports(res.data);
          if (res.data.length > 0) setSelectedId(res.data[0].id);
        } else {
          setError(res.error);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/academy/reports/${id}`).then(r => r.json());
      if (res.success) setDetail(res.data);
    } catch { /* ignore */ }
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const filteredReports = activeCategory === 'all'
    ? reports
    : reports.filter(r => r.category === activeCategory);

  const selected = reports.find(r => r.id === selectedId);
  const action = selected ? (actionMap[selected.category] || { icon: 'bi-eye', label: '常规观望', cls: 'watch' }) : null;

  if (loading) return <div className="academy-main" style={{ display: 'block', overflow: 'auto', height: 'calc(100vh - var(--nav-height))' }}><div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>加载中...</div></div>;
  if (error) return <div className="academy-main" style={{ display: 'block', overflow: 'auto', height: 'calc(100vh - var(--nav-height))' }}><div style={{ padding: '3rem', textAlign: 'center', color: '#f87171' }}>{error}</div></div>;

  return (
    <div className="academy-main">
      {/* Left: Report List */}
      <div className="report-list-pane">
        <div className="report-list-header">
          <div className="report-list-title">市场研报</div>
          <div className="report-filters">
            {['all', 'ai', 'web3', 'finance'].map(cat => (
              <button
                key={cat}
                className={`rpt-filter-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat === 'all' ? '全部' : cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="report-list-scroll">
          {filteredReports.map(r => (
            <div
              key={r.id}
              className={`rpt-item ${r.id === selectedId ? 'active' : ''}`}
              onClick={() => setSelectedId(r.id)}
            >
              <div className="rpt-item-top">
                <div className="rpt-item-badges">
                  <span className={`rpt-cat ${r.category}`}>{r.category.toUpperCase()}</span>
                </div>
                <span className="rpt-item-date">{formatDate(r.createdAt)}</span>
              </div>
              <div className="rpt-item-title">{r.title}</div>
              {r.summary && <div className="rpt-item-preview">{r.summary}</div>}
              <div className="rpt-item-footer">
                <span className="rpt-item-stat"><i className="bi bi-file-earmark-text" /> {r.articleCount} 篇来源</span>
                <span className="rpt-item-stat"><i className="bi bi-fire" /> {r.narrativeCount} 条叙事</span>
              </div>
            </div>
          ))}
          {filteredReports.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '0.82rem' }}>暂无研报数据</div>
          )}
        </div>
      </div>

      {/* Right: Report Detail */}
      <div className="report-detail-pane">
        {!selected ? (
          <div className="detail-empty">
            <i className="bi bi-file-earmark-bar-graph detail-empty-icon" />
            <h3>选择一份研报</h3>
            <p>点击左侧列表查看详细分析</p>
          </div>
        ) : detailLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            加载研报详情...
          </div>
        ) : detail ? (
          <div className="report-view active">
            {/* Action Banner */}
            <div className={`action-banner ${action!.cls}`}>
              <div className="banner-signal">
                <span className="signal-dot" />
                <span className="signal-label"><i className={`bi ${action!.icon}`} /> {action!.label}</span>
              </div>
              <div className="banner-meta">
                <span>{formatFullDate(detail.createdAt)}</span>
                <span>·</span>
                <span>{detail.category.toUpperCase()}</span>
              </div>
            </div>

            {/* Executive Summary */}
            {detail.executiveSummary && (
              <div className="executive-summary">
                <div className="summary-label">核心判断</div>
                <div className="summary-text">{detail.executiveSummary}</div>
              </div>
            )}

            {/* Signal Summary */}
            {detail.signalSummary && (
              <div className="rpt-section">
                <div className="rpt-section-title"><i className="bi bi-activity" /> 信号摘要</div>
                <div className="rpt-signal-grid">
                  {detail.signalSummary.objectiveSignalStrength != null && (
                    <div className="rpt-signal-card">
                      <div className="rpt-signal-value">{detail.signalSummary.objectiveSignalStrength}</div>
                      <div className="rpt-signal-label">信号强度</div>
                    </div>
                  )}
                  {detail.signalSummary.evidenceCount != null && (
                    <div className="rpt-signal-card">
                      <div className="rpt-signal-value">{detail.signalSummary.evidenceCount}</div>
                      <div className="rpt-signal-label">证据数</div>
                    </div>
                  )}
                  {detail.signalSummary.sourceDiversity != null && (
                    <div className="rpt-signal-card">
                      <div className="rpt-signal-value">{detail.signalSummary.sourceDiversity}</div>
                      <div className="rpt-signal-label">信源多样性</div>
                    </div>
                  )}
                </div>
                {detail.signalSummary.description && (
                  <div className="rpt-signal-desc">{detail.signalSummary.description}</div>
                )}
              </div>
            )}

            {/* Metrics */}
            <div className="metrics-bar">
              <div className="metric-item">
                <span className="metric-value">{detail.articleCount}</span>
                <span className="metric-label">情报来源</span>
              </div>
              <div className="metric-item">
                <span className="metric-value">{detail.narrativeCount}</span>
                <span className="metric-label">关联叙事</span>
              </div>
            </div>

            {/* Trend Changes */}
            {detail.trendChanges && detail.trendChanges.length > 0 && (
              <div className="rpt-section">
                <div className="rpt-section-title"><i className="bi bi-graph-up-arrow" /> 趋势变化</div>
                <div className="rpt-trend-list">
                  {detail.trendChanges.map((tc, i) => (
                    <div key={i} className="rpt-trend-item">
                      <div className="rpt-trend-metric">{tc.metric}</div>
                      <div className="rpt-trend-values">
                        <span className="rpt-trend-prev">{tc.previous}</span>
                        <i className={`bi bi-arrow-right rpt-trend-arrow ${tc.direction === 'up' ? 'up' : tc.direction === 'down' ? 'down' : ''}`} />
                        <span className={`rpt-trend-cur ${tc.direction === 'up' ? 'up' : tc.direction === 'down' ? 'down' : ''}`}>{tc.current}</span>
                      </div>
                      {tc.significance && <div className="rpt-trend-sig">{tc.significance}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sections (三阶推导核心内容) */}
            {detail.sections && detail.sections.length > 0 && (
              <div className="rpt-section">
                <div className="rpt-section-title"><i className="bi bi-book" /> 深度分析</div>
                {detail.sections.map((sec, i) => (
                  <div key={i} className="rpt-subsection">
                    <h4 className="rpt-subsection-title">{sec.title}</h4>
                    <div className="rpt-subsection-body">{sec.body}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
