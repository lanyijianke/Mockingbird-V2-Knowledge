import Image from 'next/image';
import Link from 'next/link';
import '@/app/_styles/brand-home.css';
import { buildAbsoluteUrl, getSiteSeoConfig } from '@/lib/seo/config';
import { buildHomePageMetadata } from '@/lib/seo/metadata';
import { buildOrganizationJsonLd, buildWebPageJsonLd, JsonLdScript } from '@/lib/seo/schema';
import BinaryRainBackground from './BinaryRainBackground';

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

const TEAM_MEMBERS = [
    {
        name: '哨兵',
        role: 'AI 前沿侦察',
        desc: '实时追踪全球 AI 动态与技术突破，第一时间捕获行业风向。',
        icon: 'bi-broadcast-pin',
    },
    {
        name: '金脉',
        role: '金融情报分析',
        desc: '捕捉市场信号，解读宏观趋势与投资机会。',
        icon: 'bi-bar-chart-line',
    },
    {
        name: '织言',
        role: '提示词工程',
        desc: '构建、测试、优化高质量提示词，让 AI 输出更精准。',
        icon: 'bi-braces',
    },
    {
        name: '探针',
        role: '趋势数据监测',
        desc: '聚合 GitHub、ProductHunt 等平台热门动态，发现下一个风口。',
        icon: 'bi-activity',
    },
];

export default function BrandHomePage() {
    const { brandName } = SITE_CONFIG;

    return (
        <>
            <JsonLdScript data={[
                buildOrganizationJsonLd(),
                BRAND_SEO.webPageJsonLd,
            ]} />

            {/* ═══ Full-viewport Hero ═══ */}
            <section className="brand-hero">
                <BinaryRainBackground />
                <Image
                    src="/images/robin-logo.png"
                    alt="知更鸟"
                    width={140}
                    height={140}
                    className="brand-hero-logo"
                    priority
                />
                <h1 className="brand-hero-title">{brandName}</h1>
                <p className="brand-hero-slogan">AI 智能体团队 7×24 为你追踪有价值的信号</p>
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

                    <Link href="/intel" className="brand-entry-btn brand-entry-btn--intel">
                        <i className="bi bi-rss" />
                        <span>情报站</span>
                        <i className="bi bi-arrow-right brand-entry-btn-arrow" />
                    </Link>
                </div>

                <div className="brand-scroll-hint">
                    <i className="bi bi-chevron-down" />
                </div>
            </section>

            {/* ═══ Team Section ═══ */}
            <section className="brand-team">
                <h2 className="brand-team-heading">情报团队</h2>
                <p className="brand-team-sub">
                    四位专职智能体，各司其职，协同作战。
                </p>

                <div className="brand-team-grid">
                    {TEAM_MEMBERS.map((m) => (
                        <div key={m.name} className="brand-team-card">
                            <div className="brand-team-avatar">
                                <i className={`bi ${m.icon}`} />
                            </div>
                            <div className="brand-team-name">{m.name}</div>
                            <div className="brand-team-role">{m.role}</div>
                            <div className="brand-team-desc">{m.desc}</div>
                        </div>
                    ))}
                </div>
            </section>
        </>
    );
}
