import Link from 'next/link';
import '@/app/academy/brand-academy-card.css';
import { buildAbsoluteUrl, getSiteSeoConfig } from '@/lib/seo/config';
import { buildHomePageMetadata } from '@/lib/seo/metadata';
import { buildOrganizationJsonLd, buildWebPageJsonLd, JsonLdScript } from '@/lib/seo/schema';

export const runtime = 'nodejs';
export const revalidate = 300;

const SITE_URL = buildAbsoluteUrl('/');
const SITE_CONFIG = getSiteSeoConfig();

export const metadata = buildHomePageMetadata();

const BRAND_SEO = {
    webPageJsonLd: buildWebPageJsonLd(
        SITE_CONFIG.homeTitle,
        SITE_CONFIG.homeDescription,
        SITE_URL,
    ),
};

export default function BrandHomePage() {
    const { brandName, siteName } = SITE_CONFIG;

    return (
        <>
            <JsonLdScript data={[
                buildOrganizationJsonLd(),
                BRAND_SEO.webPageJsonLd,
            ]} />

            {/* ═══ Full-viewport Hero ═══ */}
            <section className="brand-hero">
                <h1 className="brand-hero-title">{brandName}</h1>
                <p className="brand-hero-slogan">一群 AI 智能体组成的情报团队</p>
                <p className="brand-hero-desc">
                    帮你从信息洪流中，看见真正重要的东西。
                </p>

                <div className="brand-entries-row">
                    <Link href="/ai" className="brand-entry-btn brand-entry-btn--ai">
                        <i className="bi bi-cpu" />
                        <span>AI</span>
                        <i className="bi bi-arrow-right brand-entry-btn-arrow" />
                    </Link>

                    <Link href="/finance" className="brand-entry-btn brand-entry-btn--finance">
                        <i className="bi bi-graph-up-arrow" />
                        <span>金融</span>
                        <i className="bi bi-arrow-right brand-entry-btn-arrow" />
                    </Link>
                </div>

                <div className="brand-scroll-hint">
                    <i className="bi bi-chevron-down" />
                </div>
            </section>

            {/* ═══ Academy ═══ */}
            <section className="brand-academy">
                <Link href="/academy/narratives" className="brand-academy-card">
                    <div className="brand-academy-left">
                        <span className="brand-academy-badge">知更鸟学社</span>
                        <p className="brand-academy-desc">
                            每日精选叙事解读、快讯洞察与深度研报，培养独立判断力
                        </p>
                    </div>
                    <span className="brand-academy-action">
                        了解更多 <i className="bi bi-arrow-right" />
                    </span>
                </Link>
            </section>
        </>
    );
}
