import { ToastProvider } from '@/app/ToastContext';
import SiteNav from './SiteNav';
import { buildAbsoluteUrl, getSiteSeoConfig } from '@/lib/seo/config';
import { buildRootMetadata } from '@/lib/seo/metadata';
import { buildWebSiteJsonLd, JsonLdScript } from '@/lib/seo/schema';
import './globals.css';

// ════════════════════════════════════════════════════════════════
// 全局元数据 — Next.js Metadata API
// https://nextjs.org/docs/app/api-reference/functions/generate-metadata
// ════════════════════════════════════════════════════════════════

export const runtime = 'nodejs';
export const metadata = buildRootMetadata();
const SITE_HOST = new URL(buildAbsoluteUrl('/')).host;
const SITE_CONFIG = getSiteSeoConfig();
const CURRENT_YEAR = new Date().getFullYear();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
      </head>
      <body>
        <ToastProvider>
        {/* ═══ Top Navigation ═══ */}
        <SiteNav />

        {/* ═══ Main Content ═══ */}
        <main className="main-content">
          <div className="container">
            {children}
          </div>
        </main>

        {/* ═══ Footer ═══ */}
        <footer className="site-footer">
          <div>© {CURRENT_YEAR} {SITE_CONFIG.siteName} · {SITE_CONFIG.alternateName} · {SITE_HOST}</div>
          <a
            href={SITE_CONFIG.icpUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="site-footer-icp"
          >
            {SITE_CONFIG.icpNumber}
          </a>
        </footer>

        {/* ═══ WebSite JSON-LD (全局结构化数据) ═══ */}
        <JsonLdScript data={buildWebSiteJsonLd()} />
        </ToastProvider>
      </body>
    </html>
  );
}
