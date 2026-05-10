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
                <p className="brand-hero-slogan">帮你从信息洪流中，看见真正重要的东西</p>

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
                        <i className="bi bi-broadcast" />
                        <span>情报站</span>
                        <i className="bi bi-arrow-right brand-entry-btn-arrow" />
                    </Link>
                </div>

                <div className="brand-scroll-hint">
                    <i className="bi bi-chevron-down" />
                </div>
            </section>
        </>
    );
}
