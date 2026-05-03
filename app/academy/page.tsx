import Link from 'next/link';

export const metadata = { title: '知更鸟学社' };

export default function AcademyHomePage() {
  return (
    <div className="academy-main" style={{ display: 'block', overflow: 'auto', height: 'calc(100vh - var(--nav-height))' }}>
      {/* Date & Greeting */}
      <div style={{ padding: '2rem 2.5rem 1.5rem', borderBottom: '1px solid rgba(232,213,183,0.06)' }}>
        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
          {new Date().toISOString().slice(0, 10).replace(/-/g, '.')}
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Welcome back, Grank
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          你已加入学社 128 天，阅读了 12 篇文章、5 个视频、2 本书籍。本周新增了 3 篇文章。
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem', padding: '1.5rem 2.5rem' }}>
        {[
          { value: '247', label: '24h 信息采集', icon: 'bi-radio-tower', link: '/academy' },
          { value: '3', label: '新增研报', icon: 'bi-file-earmark-bar-graph', link: '/academy' },
          { value: '86', label: '信息流', icon: 'bi-star', link: '/academy' },
          { value: '5', label: '热门叙事', icon: 'bi-fire', link: '/academy/narratives' },
        ].map(stat => (
          <Link
            key={stat.label}
            href={stat.link}
            style={{
              background: 'rgba(232,213,183,0.04)', border: '1px solid rgba(232,213,183,0.08)',
              borderRadius: 10, padding: '1.2rem', display: 'block', transition: 'border-color 0.2s',
            }}
          >
            <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--academy-gold)', marginBottom: '0.3rem' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <i className={`bi ${stat.icon}`} style={{ marginRight: '0.3rem' }} /> {stat.label}
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Links */}
      <div style={{ padding: '0 2.5rem 2rem' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(232,213,183,0.35)', marginBottom: '0.8rem' }}>
          快捷入口
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}>
          {[
            { title: '热门叙事', desc: '实时追踪行业核心叙事动态', icon: 'bi-fire', link: '/academy/narratives', color: '#f87171' },
            { title: '研报中心', desc: 'AI 驱动的深度行业分析', icon: 'bi-file-earmark-bar-graph', link: '/academy', color: 'var(--cat-web3)' },
            { title: '信息流', desc: '7×24 全球情报实时推送', icon: 'bi-star', link: '/academy', color: 'var(--cat-ai)' },
          ].map(item => (
            <Link
              key={item.title}
              href={item.link}
              style={{
                background: 'rgba(17,17,17,0.5)', border: '1px solid var(--glass-border)',
                borderRadius: 10, padding: '1.5rem', display: 'block', transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '1.5rem', color: item.color, marginBottom: '0.6rem' }}>
                <i className={`bi ${item.icon}`} />
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.3rem' }}>{item.title}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
