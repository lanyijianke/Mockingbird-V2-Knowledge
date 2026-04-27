import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const {
    mockGetArticleBySlug,
    mockGetArticleCategories,
    mockGetArticleSitemapEntries,
    mockGetPagedArticles,
    mockGetPromptById,
    mockGetPromptSitemapEntries,
    mockGetPagedPrompts,
    mockGetRelatedPrompts,
    mockGetRelatedArticles,
} = vi.hoisted(() => ({
    mockGetArticleBySlug: vi.fn(),
    mockGetArticleCategories: vi.fn(),
    mockGetArticleSitemapEntries: vi.fn(),
    mockGetPagedArticles: vi.fn(),
    mockGetPromptById: vi.fn(),
    mockGetPromptSitemapEntries: vi.fn(),
    mockGetPagedPrompts: vi.fn(),
    mockGetRelatedPrompts: vi.fn(),
    mockGetRelatedArticles: vi.fn(),
}));

vi.mock('@/lib/services/article-service', async () => {
    const actual = await vi.importActual<typeof import('@/lib/services/article-service')>('@/lib/services/article-service');
    return {
        ...actual,
        getArticleBySlug: mockGetArticleBySlug,
        getArticleCategories: mockGetArticleCategories,
        getArticleSitemapEntries: mockGetArticleSitemapEntries,
        getPagedArticles: mockGetPagedArticles,
        getRelatedArticles: mockGetRelatedArticles,
    };
});

vi.mock('@/lib/services/prompt-service', async () => {
    const actual = await vi.importActual<typeof import('@/lib/services/prompt-service')>('@/lib/services/prompt-service');
    return {
        ...actual,
        getPagedPrompts: mockGetPagedPrompts,
        getPromptById: mockGetPromptById,
        getPromptSitemapEntries: mockGetPromptSitemapEntries,
        getRelatedPrompts: mockGetRelatedPrompts,
    };
});

const ORIGINAL_SITE_URL = process.env.SITE_URL;
const ORIGINAL_CAN_INDEX = process.env.SEO_CAN_INDEX;

beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env.SITE_URL = 'https://kb.example.com';
    process.env.SEO_CAN_INDEX = 'true';

    mockGetArticleCategories.mockResolvedValue([
        { code: 'tech-practice', name: '技术实战' },
        { code: 'ai-tech', name: 'AI技术' },
    ]);
    mockGetPagedArticles.mockResolvedValue({
        items: [],
        page: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 1,
    });
    mockGetArticleBySlug.mockResolvedValue({
        id: 1,
        slug: 'agent-memory',
        title: 'Agent Memory Guide',
        summary: 'Structured summary',
        content: '# Agent Memory\n\nBody copy.',
        category: 'tech-practice',
        categoryName: '技术实战',
        coverUrl: 'https://cdn.example.com/article.png',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-02T00:00:00.000Z',
        seoTitle: 'SEO Agent Memory Guide',
        seoDescription: 'SEO summary for structured memory systems.',
        seoKeywords: 'agent memory, seo',
    });
    mockGetRelatedArticles.mockResolvedValue([]);
    mockGetArticleSitemapEntries.mockResolvedValue([]);
    mockGetPagedPrompts.mockResolvedValue({
        items: [],
        page: 1,
        pageSize: 20,
        totalCount: 0,
        totalPages: 1,
    });
    mockGetPromptById.mockResolvedValue({
        id: 42,
        title: 'Gemini 视频分镜提示词',
        description: null,
        content: '这是一个用于测试 JSON-LD fallback 的长提示词内容。'.repeat(8),
        category: 'gemini-3',
        coverImageUrl: 'https://cdn.example.com/prompt.png',
        videoPreviewUrl: null,
        cardPreviewVideoUrl: null,
        author: null,
        sourceUrl: null,
        imagesJson: null,
        copyCount: 0,
        createdAt: '2026-04-03T00:00:00.000Z',
        updatedAt: null,
    });
    mockGetRelatedPrompts.mockResolvedValue([]);
    mockGetPromptSitemapEntries.mockResolvedValue([]);
});

afterEach(() => {
    if (ORIGINAL_SITE_URL === undefined) {
        delete process.env.SITE_URL;
    } else {
        process.env.SITE_URL = ORIGINAL_SITE_URL;
    }

    if (ORIGINAL_CAN_INDEX === undefined) {
        delete process.env.SEO_CAN_INDEX;
    } else {
        process.env.SEO_CAN_INDEX = ORIGINAL_CAN_INDEX;
    }
});

describe('seo cross-surface regressions', () => {
    it('uses one configured origin across metadata, robots, sitemap, and schema without leaking aigcclub.com.cn', async () => {
        process.env.SITE_URL = 'https://kb.override.example';

        const [{ buildRootMetadata }, { default: robots }, sitemapService, schema] = await Promise.all([
            import('@/lib/seo/metadata'),
            import('@/app/robots'),
            import('@/lib/services/sitemap-service'),
            import('@/lib/seo/schema'),
        ]);

        const metadata = buildRootMetadata();
        const robotsConfig = robots();
        const sitemapIndexUrls = await sitemapService.buildSitemapIndexUrls();
        const staticEntries = await sitemapService.buildSitemapChunkEntries('static');
        const webSiteSchema = schema.buildWebSiteJsonLd() as {
            url: string;
            potentialAction?: {
                target?: {
                    urlTemplate?: string;
                };
            };
        };
        const organizationSchema = schema.buildOrganizationJsonLd() as { url: string };
        const serializedSchemas = schema.serializeJsonLd([webSiteSchema, organizationSchema]);

        expect(String(metadata.metadataBase)).toBe('https://kb.override.example/');
        expect((metadata.openGraph as { url?: string } | undefined)?.url).toBe('https://kb.override.example/');
        expect(robotsConfig.sitemap).toBe('https://kb.override.example/sitemap.xml');
        expect(sitemapIndexUrls).toEqual(['https://kb.override.example/sitemaps/static.xml']);
        expect(staticEntries?.every((entry) => entry.url.startsWith('https://kb.override.example/'))).toBe(true);
        expect(webSiteSchema.url).toBe('https://kb.override.example');
        expect(webSiteSchema.potentialAction?.target?.urlTemplate).toBe(
            'https://kb.override.example/ai/articles?q={search_term_string}'
        );
        expect(organizationSchema.url).toBe('https://kb.override.example');

        expect(JSON.stringify({
            metadata,
            robotsConfig,
            sitemapIndexUrls,
            staticEntries,
            webSiteSchema,
            organizationSchema,
            serializedSchemas,
        })).not.toContain('aigcclub.com.cn');
    });

    it('keeps ai article search pages noindex,follow while stripping q from canonical', async () => {
        const { generateMetadata } = await import('@/app/ai/articles/page');
        const metadata = await generateMetadata({
            searchParams: Promise.resolve({
                q: 'agent memory',
                category: 'tech-practice',
                page: '2',
            }),
        });

        expect(metadata.alternates?.canonical).toBe('/ai/articles?category=tech-practice&page=2');
        expect(metadata.robots).toMatchObject({
            index: false,
            follow: true,
            googleBot: {
                index: false,
                follow: true,
            },
        });
        expect((metadata.openGraph as { url?: string } | undefined)?.url).toBe(
            'https://kb.example.com/ai/articles?category=tech-practice&page=2'
        );
    });

    it('keeps prompt search pages noindex,follow while stripping q from canonical', async () => {
        const { generateMetadata } = await import('@/app/prompts/page');
        const metadata = await generateMetadata({
            searchParams: Promise.resolve({
                q: 'video generation',
                category: 'gemini-3',
                page: '3',
            }),
        });

        expect(metadata.alternates?.canonical).toBe('/prompts?category=gemini-3&page=3');
        expect(metadata.robots).toMatchObject({
            index: false,
            follow: true,
            googleBot: {
                index: false,
                follow: true,
            },
        });
        expect((metadata.openGraph as { url?: string } | undefined)?.url).toBe(
            'https://kb.example.com/prompts?category=gemini-3&page=3'
        );
    });

    it('renders page-level json-ld urls without duplicated slashes', async () => {
        const [{ default: AiArticlesPage }, { default: AiArticleDetailPage }, { default: PromptsPage }] = await Promise.all([
            import('@/app/ai/articles/page'),
            import('@/app/ai/articles/[slug]/page'),
            import('@/app/prompts/page'),
        ]);

        const aiListHtml = renderToStaticMarkup(await AiArticlesPage({
            searchParams: Promise.resolve({}),
        }));
        const aiDetailHtml = renderToStaticMarkup(await AiArticleDetailPage({
            params: Promise.resolve({ slug: 'agent-memory' }),
        }));
        const promptsHtml = renderToStaticMarkup(await PromptsPage({
            searchParams: Promise.resolve({}),
        }));

        expect(aiListHtml).not.toContain('https://kb.example.com//');
        expect(aiDetailHtml).not.toContain('https://kb.example.com//');
        expect(promptsHtml).not.toContain('https://kb.example.com//');
        expect(aiListHtml).toContain('https://kb.example.com/ai/articles');
        expect(aiDetailHtml).toContain('https://kb.example.com/ai/articles/agent-memory');
        expect(promptsHtml).toContain('https://kb.example.com/prompts');
    });

    it('aligns list-page json-ld urls with canonical category/page variants', async () => {
        const [{ default: AiArticlesPage }, { default: FinanceArticlesPage }, { default: PromptsPage }] = await Promise.all([
            import('@/app/ai/articles/page'),
            import('@/app/finance/articles/page'),
            import('@/app/prompts/page'),
        ]);

        const aiListHtml = renderToStaticMarkup(await AiArticlesPage({
            searchParams: Promise.resolve({ category: 'tech-practice', page: '2' }),
        }));
        const financeListHtml = renderToStaticMarkup(await FinanceArticlesPage({
            searchParams: Promise.resolve({ category: 'tech-practice', page: '2' }),
        }));
        const promptsHtml = renderToStaticMarkup(await PromptsPage({
            searchParams: Promise.resolve({ category: 'gemini-3', page: '3' }),
        }));

        expect(aiListHtml).toContain('https://kb.example.com/ai/articles?category=tech-practice\\u0026page=2');
        expect(financeListHtml).toContain('https://kb.example.com/finance/articles?category=tech-practice\\u0026page=2');
        expect(promptsHtml).toContain('https://kb.example.com/prompts?category=gemini-3\\u0026page=3');
    });

    it('keeps article topics as a secondary path instead of duplicating category navigation on the ai list page', async () => {
        const { default: AiArticlesPage } = await import('@/app/ai/articles/page');

        const defaultHtml = renderToStaticMarkup(await AiArticlesPage({
            searchParams: Promise.resolve({}),
        }));
        const categoryHtml = renderToStaticMarkup(await AiArticlesPage({
            searchParams: Promise.resolve({ category: 'tech-practice' }),
        }));

        expect(defaultHtml).not.toContain('文章专题入口');
        expect(defaultHtml).not.toContain('专题落地页');
        expect(defaultHtml).not.toContain('/ai/articles/categories/tech-practice');
        expect(categoryHtml).not.toContain('进入当前分类专题页');
        expect(categoryHtml).not.toContain('/ai/articles/categories/tech-practice');
    });

    it('keeps article detail json-ld aligned with seo override fields', async () => {
        const [{ default: AiArticleDetailPage }, { default: FinanceArticleDetailPage }] = await Promise.all([
            import('@/app/ai/articles/[slug]/page'),
            import('@/app/finance/articles/[slug]/page'),
        ]);

        const aiDetailHtml = renderToStaticMarkup(await AiArticleDetailPage({
            params: Promise.resolve({ slug: 'agent-memory' }),
        }));
        const financeDetailHtml = renderToStaticMarkup(await FinanceArticleDetailPage({
            params: Promise.resolve({ slug: 'agent-memory' }),
        }));

        expect(aiDetailHtml).toContain('SEO Agent Memory Guide');
        expect(aiDetailHtml).toContain('SEO summary for structured memory systems.');
        expect(financeDetailHtml).toContain('SEO Agent Memory Guide');
        expect(financeDetailHtml).toContain('SEO summary for structured memory systems.');
    });

    it('keeps prompt detail json-ld description aligned with metadata fallback content slice', async () => {
        const { default: PromptDetailPage } = await import('@/app/prompts/[id]/page');
        const html = renderToStaticMarkup(await PromptDetailPage({
            params: Promise.resolve({ id: '42' }),
        }));
        const expectedSnippet = '这是一个用于测试 JSON-LD fallback 的长提示词内容。'.repeat(8).slice(0, 160);

        expect(html).toContain(expectedSnippet);
    });
});
