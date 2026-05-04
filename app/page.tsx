import Link from 'next/link';
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

            {/* ═══ Brand Hero ═══ */}
            <section className="brand-hero">
                <h1 className="brand-hero-title">{brandName}</h1>
                <p className="brand-hero-slogan">帮你在信息洪流中，发掘真正有价值的东西</p>
                <p className="brand-hero-desc">
                    {siteName} — 一个专注发掘与传递价值的知识平台。我们筛选、整理并呈现各领域最值得阅读的内容，让你的每一分钟都有收获。
                </p>
            </section>

            {/* ═══ Dual Entry Cards ═══ */}
            <section className="brand-entries">
                <div className="brand-entries-grid">
                    <Link href="/ai" className="brand-entry-card glass glass-card">
                        <i className="bi bi-cpu brand-entry-icon" />
                        <h2 className="brand-entry-title">AI 知识库</h2>
                        <p className="brand-entry-desc">
                            深度文章、提示词精选与实时热榜，助你立于 AI 前沿
                        </p>
                        <span className="brand-entry-action">
                            进入 <i className="bi bi-arrow-right" />
                        </span>
                    </Link>

                    <Link href="/finance" className="brand-entry-card glass glass-card">
                        <i className="bi bi-graph-up-arrow brand-entry-icon" />
                        <h2 className="brand-entry-title">金融知识库</h2>
                        <p className="brand-entry-desc">
                            宏观研判、市场信号与机构研报，把握金融脉搏
                        </p>
                        <span className="brand-entry-action">
                            进入 <i className="bi bi-arrow-right" />
                        </span>
                    </Link>
                </div>
            </section>

            {/* ═══ Academy Promo ═══ */}
            <section className="brand-academy">
                <Link href="/academy/narratives" className="brand-academy-card glass glass-card">
                    <span className="brand-academy-badge">知更鸟学社</span>
                    <p className="brand-academy-desc">
                        每日精选叙事解读、快讯洞察与深度研报，培养独立判断力
                    </p>
                    <span className="brand-entry-action">
                        了解更多 <i className="bi bi-arrow-right" />
                    </span>
                </Link>
            </section>
        </>
    );
}
