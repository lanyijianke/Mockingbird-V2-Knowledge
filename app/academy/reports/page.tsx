'use client';

import { useState, useEffect } from 'react';

interface Report {
  id: number;
  title: string;
  category: string;
  summary: string;
  articleCount: number;
  narrativeCount: number;
  createdAt: string;
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
        ) : (
          <div className="report-view active">
            {/* Action Banner */}
            <div className={`action-banner ${action!.cls}`}>
              <div className="banner-signal">
                <span className="signal-dot" />
                <span className="signal-label"><i className={`bi ${action!.icon}`} /> {action!.label}</span>
              </div>
              <div className="banner-meta">
                <span>{formatFullDate(selected.createdAt)}</span>
                <span>·</span>
                <span>{selected.category.toUpperCase()}</span>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="executive-summary">
              <div className="summary-label">核心判断</div>
              <div className="summary-text">{selected.summary || '暂无核心判断'}</div>
            </div>

            {/* Metrics */}
            <div className="metrics-bar">
              <div className="metric-item">
                <span className="metric-value">{selected.articleCount}</span>
                <span className="metric-label">情报来源</span>
              </div>
              <div className="metric-item">
                <span className="metric-value">{selected.narrativeCount}</span>
                <span className="metric-label">关联叙事</span>
              </div>
            </div>

            {/* Footer */}
            <div className="report-detail-footer">
              <a href="#"><i className="bi bi-box-arrow-up-right" /> 对象详情页</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
