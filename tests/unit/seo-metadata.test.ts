import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetArticleCategories, mockGetPromptById } = vi.hoisted(() => ({
    mockGetArticleCategories: vi.fn(),
    mockGetPromptById: vi.fn(),
}));

vi.mock('@/lib/services/article-service', async () => {
    const actual = await vi.importActual<typeof import('@/lib/services/article-service')>('@/lib/services/article-service');
    return {
        ...actual,
        getArticleCategories: mockGetArticleCategories,
    };
});

vi.mock('@/lib/services/prompt-service', async () => {
    const actual = await vi.importActual<typeof import('@/lib/services/prompt-service')>('@/lib/services/prompt-service');
    return {
        ...actual,
        getPromptById: mockGetPromptById,
    };
});

const ORIGINAL_SITE_URL = process.env.SITE_URL;
const ORIGINAL_CAN_INDEX = process.env.SEO_CAN_INDEX;

beforeEach(() => {
    vi.resetModules();
    process.env.SITE_URL = 'https://kb.example.com';
    process.env.SEO_CAN_INDEX = 'true';

    mockGetArticleCategories.mockResolvedValue([
        { code: 'tech-practice', name: '技术实战' },
        { code: 'ai-tech', name: 'AI技术' },
    ]);

    mockGetPromptById.mockResolvedValue({
        id: 42,
        title: 'Gemini 视频分镜提示词',
        description: '用于测试的提示词描述',
        content: '用于测试的提示词内容',
        coverImageUrl: 'https://cdn.example.com/prompt.png',
    });
});

describe('articles metadata', () => {
    it('marks search pages as noindex and keeps canonical without q', async () => {
        const { generateMetadata: generateArticlesMetadata } = await import('@/app/ai/articles/page');
        const metadata = await generateArticlesMetadata({
            searchParams: Promise.resolve({
                q: '  AI 安全  ',
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

    it('normalizes invalid pagination/category params', async () => {
        const { generateMetadata: generateArticlesMetadata } = await import('@/app/ai/articles/page');
        const metadata = await generateArticlesMetadata({
            searchParams: Promise.resolve({
                category: 'invalid-category',
                page: '0',
            }),
        });

        expect(metadata.alternates?.canonical).toBe('/ai/articles');
        expect(metadata.robots).toBeUndefined();
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

describe('prompts metadata', () => {
    it('builds canonical from valid category/page', async () => {
        const { generateMetadata: generatePromptsMetadata } = await import('@/app/prompts/page');
        const metadata = await generatePromptsMetadata({
            searchParams: Promise.resolve({
                category: 'gemini-3',
                page: '3',
            }),
        });

        expect(metadata.alternates?.canonical).toBe('/prompts?category=gemini-3&page=3');
        expect(metadata.robots).toBeUndefined();
    });

    it('marks search pages as noindex and strips search term from canonical', async () => {
        const { generateMetadata: generatePromptsMetadata } = await import('@/app/prompts/page');
        const metadata = await generatePromptsMetadata({
            searchParams: Promise.resolve({
                q: 'video generation',
                category: 'gemini-3',
                page: '1',
            }),
        });

        expect(metadata.alternates?.canonical).toBe('/prompts?category=gemini-3');
        expect(metadata.robots).toMatchObject({
            index: false,
            follow: true,
        });
    });

    it('uses the configured origin for prompt detail metadata', async () => {
        const { generateMetadata: generatePromptDetailMetadata } = await import('@/app/prompts/[id]/page');
        const metadata = await generatePromptDetailMetadata({
            params: Promise.resolve({ id: '42' }),
        });

        expect(metadata.alternates?.canonical).toBe('/prompts/42');
        expect((metadata.openGraph as { url?: string } | undefined)?.url).toBe('https://kb.example.com/prompts/42');
        expect(metadata.twitter).toMatchObject({
            card: 'summary_large_image',
            images: ['https://cdn.example.com/prompt.png'],
        });
    });
});

describe('shared metadata builders', () => {
    it('builds root metadata from the configured origin', async () => {
        const { buildRootMetadata } = await import('@/lib/seo/metadata');
        const metadata = buildRootMetadata();

        expect(String(metadata.metadataBase)).toBe('https://kb.example.com/');
        expect(metadata.alternates?.canonical).toBe('/');
        expect(metadata.robots).toMatchObject({
            index: true,
            follow: true,
        });
    });

    it('builds ranking metadata with canonical and open graph url parity', async () => {
        const { buildRankingMetadata } = await import('@/lib/seo/metadata');
        const metadata = buildRankingMetadata({
            title: 'ProductHunt 每日热榜 — 排行榜',
            description: '聚合 ProductHunt 全球最热门的新产品与工具，每 2 小时自动更新。',
            canonicalPath: '/rankings/producthunt',
        });

        expect(metadata.alternates?.canonical).toBe('/rankings/producthunt');
        expect((metadata.openGraph as { url?: string } | undefined)?.url).toBe('https://kb.example.com/rankings/producthunt');
    });

    it('builds article category landing metadata with canonical and keyword parity', async () => {
        const { buildArticleCategoryLandingMetadata } = await import('@/lib/seo/metadata');
        const metadata = buildArticleCategoryLandingMetadata({
            categoryName: 'AI技术',
            canonicalPath: '/ai/articles/categories/ai-tech',
        });

        expect(metadata.title).toBe('AI技术文章 - 知更鸟知识库');
        expect(metadata.description).toBe('聚合知更鸟知识库内与 AI技术 相关的精选文章、教程与实践案例。');
        expect(metadata.alternates?.canonical).toBe('/ai/articles/categories/ai-tech');
        expect(metadata.keywords).toEqual(['AI技术', 'AI技术文章', 'AI 教程', 'AI 实践']);
        expect((metadata.openGraph as { url?: string } | undefined)?.url).toBe(
            'https://kb.example.com/ai/articles/categories/ai-tech'
        );
    });

    it('builds prompt category landing metadata with override support', async () => {
        const { buildPromptCategoryLandingMetadata } = await import('@/lib/seo/metadata');
        const metadata = buildPromptCategoryLandingMetadata({
            categoryName: 'Gemini 3',
            canonicalPath: '/prompts/categories/gemini-3',
            title: 'Gemini 3 提示词精选',
            description: '覆盖 Gemini 3 视频、图像与代理工作流的高质量提示词。',
            keywords: ['Gemini 3', '视频生成提示词'],
        });

        expect(metadata.title).toBe('Gemini 3 提示词精选');
        expect(metadata.description).toBe('覆盖 Gemini 3 视频、图像与代理工作流的高质量提示词。');
        expect(metadata.alternates?.canonical).toBe('/prompts/categories/gemini-3');
        expect(metadata.keywords).toEqual(['Gemini 3', '视频生成提示词']);
        expect((metadata.openGraph as { url?: string } | undefined)?.url).toBe(
            'https://kb.example.com/prompts/categories/gemini-3'
        );
    });
});
