import { ToastProvider } from '@/app/ToastContext';
import { AuthModalProvider } from '@/app/AuthModalContext';
import SiteNav from './SiteNav';
import { buildRootMetadata } from '@/lib/seo/metadata';
import { buildWebSiteJsonLd, JsonLdScript } from '@/lib/seo/schema';
import './globals.css';
import '@/app/_styles/nav.css';

// ════════════════════════════════════════════════════════════════
// 全局元数据 — Next.js Metadata API
// https://nextjs.org/docs/app/api-reference/functions/generate-metadata
// ════════════════════════════════════════════════════════════════

export const runtime = 'nodejs';
export const metadata = buildRootMetadata();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
      </head>
      <body>
        <ToastProvider>
        <AuthModalProvider>
        {/* ═══ Top Navigation ═══ */}
        <SiteNav />

        {/* ═══ Main Content ═══ */}
        <main className="main-content">
          <div className="container">
            {children}
          </div>
        </main>

        {/* ═══ WebSite JSON-LD (全局结构化数据) ═══ */}
        <JsonLdScript data={buildWebSiteJsonLd()} />
        </AuthModalProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
