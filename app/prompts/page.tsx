import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getPagedPrompts } from '@/lib/services/prompt-service';
import { getSubcategories, getCategoryName } from '@/lib/categories';
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd, JsonLdScript } from '@/lib/utils/json-ld';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SITE_URL = process.env.SITE_URL || 'https://aigcclub.com.cn';
const PROMPT_CATEGORY_CODES = new Set(getSubcategories('multimodal-prompts').map((item) => item.code));

function normalizePage(rawPage?: string): number {
    const parsed = Number.parseInt(rawPage || '1', 10);
    return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
}

function normalizeCategory(rawCategory?: string): string | undefined {
    if (!rawCategory) return undefined;
    return PROMPT_CATEGORY_CODES.has(rawCategory) ? rawCategory : undefined;
}

function normalizeSearchQuery(rawQuery?: string): string | undefined {
    const trimmed = rawQuery?.trim();
    if (!trimmed) return undefined;
    return trimmed.slice(0, 200);
}

function buildPromptsCanonicalPath(page: number, category?: string): string {
    const parts: string[] = [];
    if (category) parts.push(`category=${encodeURIComponent(category)}`);
    if (page > 1) parts.push(`page=${page}`);
    return parts.length > 0 ? `/prompts?${parts.join('&')}` : '/prompts';
}

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; category?: string; q?: string }>;
}): Promise<Metadata> {
    const params = await searchParams;
    const page = normalizePage(params.page);
    const category = normalizeCategory(params.category);
    const q = normalizeSearchQuery(params.q);
    const canonicalPath = buildPromptsCanonicalPath(page, category);

    let title = '提示词库';
    if (category) title = `${getCategoryName(category)} 提示词`;
    if (q) title = `搜索「${q}」`;

    return {
        title,
        description: `浏览知更鸟知识库的 AI 提示词精选 — ${title}`,
        alternates: { canonical: canonicalPath },
        robots: q ? {
            index: false,
            follow: true,
            googleBot: {
                index: false,
                follow: true,
            },
        } : undefined,
        openGraph: {
            title: `${title} - 知更鸟知识库`,
            description: `浏览知更鸟知识库的 AI 提示词精选 — ${title}`,
            url: `${SITE_URL}${canonicalPath}`,
            type: 'website',
        },
    };
}

export default async function PromptsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; category?: string; q?: string }>;
}) {
    const params = await searchParams;
    const page = normalizePage(params.page);
    const category = normalizeCategory(params.category);
    const q = normalizeSearchQuery(params.q);

    const result = await getPagedPrompts(page, 20, category, q);

    // 多模态提示词子类
    const promptCategories = getSubcategories('multimodal-prompts');

    function buildPageUrl(p: number) {
        const parts: string[] = [];
        if (p > 1) parts.push(`page=${p}`);
        if (category) parts.push(`category=${encodeURIComponent(category)}`);
        if (q) parts.push(`q=${encodeURIComponent(q)}`);
        return parts.length ? `/prompts?${parts.join('&')}` : '/prompts';
    }

    return (
        <div className="prompts-page">
            {/* SEO: BreadcrumbList + CollectionPage JSON-LD */}
            <JsonLdScript data={[
                buildBreadcrumbJsonLd([
                    { name: '首页', url: SITE_URL },
                    { name: '提示词库', url: `${SITE_URL}/prompts` },
                ]),
                buildCollectionPageJsonLd('提示词库', '浏览知更鸟知识库的全部 AI 提示词精选', `${SITE_URL}/prompts`),
            ]} />

            {/* 粘性搜索栏 */}
            <div className="prompts-sticky-header">
                <form method="get" action="/prompts" className="prompts-search-bar">
                    <i className="bi bi-search" />
                    <input
                        type="text"
                        name="q"
                        placeholder="搜索提示词..."
                        defaultValue={q}
                    />
                    {category && <input type="hidden" name="category" value={category} />}
                    <button type="submit"><i className="bi bi-arrow-return-left" /></button>
                </form>

                {/* 过滤胶囊 */}
                <div className="prompts-filter-row">
                    <Link
                        href="/prompts"
                        className={`filter-pill ${!category ? 'active' : ''}`}
                    >
                        全部
                    </Link>
                    {promptCategories.map((cat) => (
                        <Link
                            key={cat.code}
                            href={`/prompts?category=${cat.code}`}
                            className={`filter-pill ${category === cat.code ? 'active' : ''}`}
                        >
                            {cat.name}
                        </Link>
                    ))}
                </div>
            </div>

            {/* 瀑布流/网格卡片 */}
            {result.items.length > 0 ? (
                <div className="prompts-masonry">
                    {result.items.map((prompt, idx) => (
                        <Link
                            key={prompt.id}
                            href={`/prompts/${prompt.id}`}
                            className="prompt-card-v2"
                            style={{ animationDelay: `${idx * 0.04}s` }}
                        >
                            {/* 封面图 */}
                            <div className="pc2-cover">
                                {prompt.coverImageUrl ? (
                                    <Image
                                        src={prompt.coverImageUrl}
                                        alt={prompt.title}
                                        fill
                                        sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 25vw"
                                        style={{ objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div className="pc2-cover-empty">
                                        <i className="bi bi-lightbulb" />
                                    </div>
                                )}

                                {/* 统计标签 */}
                                <span className="pc2-stat">
                                    <i className="bi bi-clipboard" /> {prompt.copyCount.toLocaleString()}
                                </span>

                                {/* 视频标记 */}
                                {prompt.videoPreviewUrl && (
                                    <span className="pc2-video-badge">
                                        <i className="bi bi-play-circle-fill" />
                                    </span>
                                )}

                                {/* 底部渐变覆盖层 + 信息 */}
                                <div className="pc2-overlay">
                                    <span className="pc2-category">{getCategoryName(prompt.category)}</span>
                                    <h3 className="pc2-title">{prompt.title}</h3>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="empty-state glass">
                    <i className="bi bi-collection" />
                    <p>暂无提示词</p>
                </div>
            )}

            {/* 分页 */}
            {result.totalPages > 1 && (
                <nav className="prompts-pagination">
                    {page > 1 && (
                        <Link href={buildPageUrl(page - 1)} className="page-btn">
                            <i className="bi bi-chevron-left" /> 上一页
                        </Link>
                    )}
                    <span className="page-info">{page} / {result.totalPages}</span>
                    {page < result.totalPages && (
                        <Link href={buildPageUrl(page + 1)} className="page-btn">
                            下一页 <i className="bi bi-chevron-right" />
                        </Link>
                    )}
                </nav>
            )}
        </div>
    );
}
