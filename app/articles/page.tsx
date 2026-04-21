import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getPagedArticles } from '@/lib/services/article-service';
import { getSubcategories, getCategoryName } from '@/lib/categories';
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd, JsonLdScript } from '@/lib/utils/json-ld';

export const dynamic = 'force-dynamic'; // SSR for search/filter support
export const runtime = 'nodejs';

const SITE_URL = process.env.SITE_URL || 'https://aigcclub.com.cn';
const ARTICLE_CATEGORY_CODES = new Set(getSubcategories('articles').map((item) => item.code));

function normalizePage(rawPage?: string): number {
    const parsed = Number.parseInt(rawPage || '1', 10);
    return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
}

function normalizeCategory(rawCategory?: string): string | undefined {
    if (!rawCategory) return undefined;
    return ARTICLE_CATEGORY_CODES.has(rawCategory) ? rawCategory : undefined;
}

function normalizeSearchQuery(rawQuery?: string): string | undefined {
    const trimmed = rawQuery?.trim();
    if (!trimmed) return undefined;
    return trimmed.slice(0, 200);
}

function buildArticlesCanonicalPath(page: number, category?: string): string {
    const parts: string[] = [];
    if (category) parts.push(`category=${encodeURIComponent(category)}`);
    if (page > 1) parts.push(`page=${page}`);
    return parts.length > 0 ? `/articles?${parts.join('&')}` : '/articles';
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
    const canonicalPath = buildArticlesCanonicalPath(page, category);

    let title = '所有文章';
    if (category) title = `${getCategoryName(category)} 文章`;
    if (q) title = `搜索「${q}」`;

    return {
        title,
        description: `浏览知更鸟知识库的 AI 文章合集 — ${title}`,
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
            description: `浏览知更鸟知识库的 AI 文章合集 — ${title}`,
            url: `${SITE_URL}${canonicalPath}`,
            type: 'website',
        },
    };
}

export default async function ArticlesPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; category?: string; q?: string }>;
}) {
    const params = await searchParams;
    const page = normalizePage(params.page);
    const category = normalizeCategory(params.category);
    const q = normalizeSearchQuery(params.q);

    const result = await getPagedArticles(page, 10, category, q);

    // 文章子类（articles 分组下的子分类）
    const articleCategories = getSubcategories('articles');

    // 构建带保留参数的分页 URL
    function buildPageUrl(p: number) {
        const parts: string[] = [];
        if (p > 1) parts.push(`page=${p}`);
        if (category) parts.push(`category=${encodeURIComponent(category)}`);
        if (q) parts.push(`q=${encodeURIComponent(q)}`);
        return parts.length ? `/articles?${parts.join('&')}` : '/articles';
    }

    return (
        <div className="articles-page">
            {/* SEO: BreadcrumbList + CollectionPage JSON-LD */}
            <JsonLdScript data={[
                buildBreadcrumbJsonLd([
                    { name: '首页', url: SITE_URL },
                    { name: '所有文章', url: `${SITE_URL}/articles` },
                ]),
                buildCollectionPageJsonLd('文章库', '浏览知更鸟知识库的全部 AI 文章', `${SITE_URL}/articles`),
            ]} />

            {/* 面包屑导航 */}
            <nav className="breadcrumb">
                <Link href="/" className="crumb-link">
                    <i className="bi bi-house-door" /> 首页
                </Link>
                <span className="crumb-separator">/</span>
                <span className="crumb-current">所有文章</span>
            </nav>

            {/* 居中搜索栏 */}
            <div className="search-container">
                <form method="get" action="/articles" className="search-box glass">
                    <i className="bi bi-search search-icon" />
                    <input
                        type="text"
                        name="q"
                        className="search-input-full"
                        placeholder="输入关键词搜索文章..."
                        defaultValue={q}
                    />
                    {category && <input type="hidden" name="category" value={category} />}
                    <button type="submit" className="search-submit-btn">
                        <i className="bi bi-arrow-return-left" />
                    </button>
                </form>
            </div>

            {/* 水平过滤条 */}
            <div className="filter-bar-container">
                <div className="filter-bar-scroll">
                    <Link
                        href="/articles"
                        className={`filter-item ${!category ? 'active' : ''}`}
                    >
                        全部
                    </Link>
                    {articleCategories.map((cat) => (
                        <Link
                            key={cat.code}
                            href={`/articles?category=${cat.code}`}
                            className={`filter-item ${category === cat.code ? 'active' : ''}`}
                        >
                            {cat.name}
                        </Link>
                    ))}
                </div>
            </div>

            {/* 水平文章卡片列表 */}
            {result.items.length > 0 ? (
                <div className="articles-list">
                    {result.items.map((article, i) => (
                        <div
                            key={article.id}
                            className="animate-emerge"
                            style={{ animationDelay: `${(i * 0.1).toFixed(1)}s` }}
                        >
                            <Link
                                href={`/articles/${article.slug}`}
                                className="article-item glass glass-card"
                            >
                                <div className="article-cover">
                                    <Image
                                        src={article.coverUrl || '/images/default-cover.png'}
                                        alt={article.title}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 320px"
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>
                                <div className="article-info">
                                    <div className="article-meta">
                                        <span className="category">{getCategoryName(article.category)}</span>
                                        <span className="dot">·</span>
                                        <span className="date">
                                            {new Date(article.createdAt).toLocaleDateString('zh-CN', {
                                                timeZone: 'Asia/Shanghai',
                                            })}
                                        </span>
                                    </div>
                                    <h2 className="article-title">{article.title}</h2>
                                    <p className="article-summary">{article.summary}</p>
                                    <div className="article-footer">
                                        <span className="read-more">
                                            阅读全文 <i className="bi bi-arrow-right" />
                                        </span>
                                        <span className="views">
                                            <i className="bi bi-eye" /> {article.viewCount.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state glass">
                    <i className="bi bi-journal-x" />
                    <p>该分类下暂无文章，换个分类试试？</p>
                </div>
            )}

            {/* 分页导航 */}
            {result.totalPages > 1 && (
                <nav className="pagination-nav">
                    {page > 1 && (
                        <Link href={buildPageUrl(page - 1)} className="page-btn">
                            <i className="bi bi-chevron-left" /> 上一页
                        </Link>
                    )}
                    <span className="page-info">第 {page} / {result.totalPages} 页</span>
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
