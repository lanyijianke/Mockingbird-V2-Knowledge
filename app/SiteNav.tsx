'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NavAuthButton from '@/app/NavAuthButton';
import { getArticleListPath } from '@/lib/articles/article-route-paths';
import { getSiteSeoConfig } from '@/lib/seo/config';

export default function SiteNav() {
  const pathname = usePathname();
  const { brandName } = getSiteSeoConfig();

  const isBrandHome = pathname === '/';
  const isAi = pathname.startsWith('/ai');
  const isFinance = pathname.startsWith('/finance');
  const isIntel = pathname.startsWith('/intel');

  if (isBrandHome) return null;

  const brandHref = isAi ? '/ai' : isFinance ? '/finance' : isIntel ? '/intel' : '/';

  return (
    <nav className="top-nav">
      <div className="nav-left" />

      <div className="nav-center">
        <div className="nav-divider" />
        <div className="nav-brand-name">
          <Link href={brandHref}>{brandName}</Link>
        </div>
        <div className="nav-divider" />
      </div>

      <div className="nav-right">
        {/* ── AI subsite navigation ── */}
        {isAi && (
          <>
            <Link href={getArticleListPath('ai')} className="nav-link">AI文章</Link>
            <Link href="/ai/prompts" className="nav-link">提示词</Link>

            {/* Mobile: plain link */}
            <Link href="/ai/rankings/topics" className="nav-link nav-mobile-only">
              热榜
            </Link>

            {/* Desktop: dropdown */}
            <div className="nav-dropdown nav-desktop-only">
              <Link href="/ai/rankings/github" className="nav-link nav-dropdown-trigger">
                热榜 <i className="bi bi-chevron-down nav-dropdown-arrow" />
              </Link>
              <div className="nav-dropdown-menu">
                <Link href="/ai/rankings/github" className="nav-dropdown-item">
                  <i className="bi bi-github" style={{ color: '#58a6ff' }} />
                  <span>GitHub Trending</span>
                </Link>
                <Link href="/ai/rankings/producthunt" className="nav-dropdown-item">
                  <i className="bi bi-rocket-takeoff" style={{ color: '#ff6154' }} />
                  <span>ProductHunt</span>
                </Link>
                <Link href="/ai/rankings/skills-trending" className="nav-dropdown-item">
                  <i className="bi bi-fire" style={{ color: '#f0883e' }} />
                  <span>Skills Trending</span>
                </Link>
                <Link href="/ai/rankings/skills-hot" className="nav-dropdown-item">
                  <i className="bi bi-lightning-charge" style={{ color: '#a371f7' }} />
                  <span>Skills Hot</span>
                </Link>
              </div>
            </div>

            <Link href="/academy/narratives" className="nav-link academy-link">学社</Link>
            <NavAuthButton />
          </>
        )}

        {/* ── Finance subsite navigation ── */}
        {isFinance && (
          <>
            <Link href={getArticleListPath('finance')} className="nav-link">金融文章</Link>
            <Link href="/academy/narratives" className="nav-link academy-link">学社</Link>
            <NavAuthButton />
          </>
        )}

        {/* ── Intel subsite navigation ── */}
        {isIntel && (
          <>
            <Link href="/intel" className="nav-link">情报站</Link>
            <Link href="/academy/narratives" className="nav-link academy-link">学社</Link>
            <NavAuthButton />
          </>
        )}

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
      </div>
    </nav>
  );
}
