import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const {
    mockGetArticleCategories,
    mockGetPagedArticles,
    mockGetPagedPrompts,
} = vi.hoisted(() => ({
    mockGetArticleCategories: vi.fn(),
    mockGetPagedArticles: vi.fn(),
    mockGetPagedPrompts: vi.fn(),
}));

vi.mock('@/lib/services/article-service', async () => {
    const actual = await vi.importActual<typeof import('@/lib/services/article-service')>('@/lib/services/article-service');
    return {
        ...actual,
        getArticleCategories: mockGetArticleCategories,
        getPagedArticles: mockGetPagedArticles,
    };
});

vi.mock('@/lib/services/prompt-service', async () => {
    const actual = await vi.importActual<typeof import('@/lib/services/prompt-service')>('@/lib/services/prompt-service');
    return {
        ...actual,
        getPagedPrompts: mockGetPagedPrompts,
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
        { code: 'ai-tech', name: 'AI 技术' },
    ]);

    mockGetPagedArticles.mockResolvedValue({
        items: [
            {
                id: 1,
                slug: 'agent-memory',
                title: 'Agent Memory Guide',
                summary: 'Structured memory patterns for production agents.',
                category: 'tech-practice',
                categoryName: '技术实战',
                createdAt: '2026-04-01T00:00:00.000Z',
            },
            {
                id: 2,
                slug: 'rag-observability',
                title: 'RAG Observability Checklist',
                summary: 'How to instrument retrieval and answer quality.',
                category: 'tech-practice',
                categoryName: '技术实战',
                createdAt: '2026-04-02T00:00:00.000Z',
            },
        ],
        page: 1,
        pageSize: 10,
        totalCount: 2,
        totalPages: 1,
    });

    mockGetPagedPrompts.mockResolvedValue({
        items: [
            {
                id: 101,
                title: 'Gemini 视频分镜提示词',
                description: 'Generate storyboard-ready shots and camera instructions.',
                category: 'gemini-3',
            },
            {
                id: 202,
                title: 'Gemini 广告脚本提示词',
                description: 'Build short-form ad scripts with hooks and CTA beats.',
                category: 'gemini-3',
            },
        ],
        page: 1,
        pageSize: 20,
        totalCount: 2,
        totalPages: 1,
    });
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

describe('category landing pages', () => {
    it('builds prompt category landing metadata and renders intro, links, and schemas', async () => {
        const { default: PromptCategoryPage, generateMetadata } = await import('@/app/prompts/categories/[category]/page');

        const metadata = await generateMetadata({
            params: Promise.resolve({ category: 'gemini-3' }),
        });
        const html = renderToStaticMarkup(await PromptCategoryPage({
            params: Promise.resolve({ category: 'gemini-3' }),
        }));

        expect(metadata.alternates?.canonical).toBe('/prompts/categories/gemini-3');
        expect((metadata.openGraph as { url?: string } | undefined)?.url).toBe(
            'https://kb.example.com/prompts/categories/gemini-3'
        );
        expect(html).toContain('Gemini 3 提示词');
        expect(html).toContain('CollectionPage');
        expect(html).toContain('ItemList');
        expect(html).toContain('BreadcrumbList');
        expect(html).toContain('/prompts/101');
        expect(html).toContain('/prompts/202');
        expect(html).toContain('/prompts?category=gemini-3');
    });

    it('builds ai article category landing metadata and renders intro, links, and schemas', async () => {
        const { default: ArticleCategoryPage, generateMetadata } = await import('@/app/ai/articles/categories/[category]/page');

        const metadata = await generateMetadata({
            params: Promise.resolve({ category: 'tech-practice' }),
        });
        const html = renderToStaticMarkup(await ArticleCategoryPage({
            params: Promise.resolve({ category: 'tech-practice' }),
        }));

        expect(metadata.alternates?.canonical).toBe('/ai/articles/categories/tech-practice');
        expect((metadata.openGraph as { url?: string } | undefined)?.url).toBe(
            'https://kb.example.com/ai/articles/categories/tech-practice'
        );
        expect(html).toContain('技术实战 AI 文章');
        expect(html).toContain('CollectionPage');
        expect(html).toContain('ItemList');
        expect(html).toContain('BreadcrumbList');
        expect(html).toContain('/ai/articles/agent-memory');
        expect(html).toContain('/ai/articles/rag-observability');
        expect(html).toContain('/ai/articles?category=tech-practice');
    });
});
