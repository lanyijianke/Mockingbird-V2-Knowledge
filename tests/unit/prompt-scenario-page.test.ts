import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetPagedPrompts = vi.fn();
const mockGetPromptScenarioPages = vi.fn();
const mockGetPromptScenarioPageBySlug = vi.fn();

vi.mock('next/image', async () => {
    const ReactModule = await import('react');

    return {
        default: (props: Record<string, unknown>) => ReactModule.createElement('img', props),
    };
});

vi.mock('next/link', async () => {
    const ReactModule = await import('react');

    return {
        default: ({
            href,
            children,
            ...props
        }: {
            href: string;
            children: React.ReactNode;
        }) => ReactModule.createElement('a', { href, ...props }, children),
    };
});

vi.mock('next/navigation', () => ({
    notFound: () => {
        throw new Error('NEXT_NOT_FOUND');
    },
}));

vi.mock('@/lib/services/prompt-service', () => ({
    getPagedPrompts: mockGetPagedPrompts,
}));

vi.mock('@/lib/seo/growth-pages', () => ({
    getPromptScenarioPages: mockGetPromptScenarioPages,
    getPromptScenarioPageBySlug: mockGetPromptScenarioPageBySlug,
}));

const videoScenario = {
    slug: 'video-generation',
    canonicalPath: '/prompts/scenarios/video-generation',
    title: '视频生成提示词',
    description: '围绕视频生成任务整理可复用提示词、步骤、FAQ 与引用。',
    intro: '聚合真实提示词供给，补上更适合搜索与 AI 引用的解释块。',
    promptCategory: 'video-generation',
    promptSourceCategory: 'gemini-3',
    promptSearchQuery: 'video generation',
    blocks: [
        {
            type: 'definition',
            heading: '什么是视频生成提示词',
            body: '面向文生视频、图生视频和镜头控制的提示词集合。',
        },
        {
            type: 'faq',
            heading: '视频生成提示词常见问题',
            items: [
                {
                    question: '什么时候需要更长的提示词？',
                    answer: '当你需要同时约束镜头、动作和风格时。',
                },
            ],
        },
        {
            type: 'steps',
            heading: '如何使用本页提示词',
            items: [
                {
                    name: '先选任务',
                    text: '先选最接近目标镜头和风格的真实提示词样本。',
                },
            ],
        },
    ],
};

const imageScenario = {
    slug: 'image-concepts',
    canonicalPath: '/prompts/scenarios/image-concepts',
    title: '概念图提示词',
    description: '概念图场景页。',
    intro: '回退到 promptCategory 取数。',
    promptCategory: 'image-generation',
    blocks: [],
};

describe('prompt scenario pages', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();

        mockGetPromptScenarioPages.mockReturnValue([videoScenario, imageScenario]);
        mockGetPromptScenarioPageBySlug.mockImplementation((slug: string) => {
            if (slug === 'video-generation') return videoScenario;
            if (slug === 'image-concepts') return imageScenario;
            return null;
        });
        mockGetPagedPrompts.mockResolvedValue({
            items: [
                {
                    id: 101,
                    title: 'Video prompt example',
                    description: 'Create a product teaser video.',
                    content: 'Use a cinematic camera move.',
                    category: 'gemini-3',
                    coverImageUrl: null,
                    videoPreviewUrl: null,
                    cardPreviewVideoUrl: null,
                    copyCount: 0,
                },
            ],
            totalCount: 1,
            page: 1,
            pageSize: 12,
            totalPages: 1,
        });
    });

    it('renders scenario detail metadata, AI SEO blocks, and selected prompt links from source category', async () => {
        const pageModule = await import('@/app/prompts/scenarios/[slug]/page');

        const metadata = await pageModule.generateMetadata({
            params: Promise.resolve({ slug: 'video-generation' }),
        });
        const element = await pageModule.default({
            params: Promise.resolve({ slug: 'video-generation' }),
        });
        const html = renderToStaticMarkup(element as React.ReactElement);

        expect(metadata.alternates?.canonical).toBe('/prompts/scenarios/video-generation');
        expect(mockGetPagedPrompts).toHaveBeenCalledWith(1, 12, 'gemini-3', undefined);
        expect(html).toContain('什么是视频生成提示词');
        expect(html).toContain('视频生成提示词常见问题');
        expect(html).toContain('/prompts/101');
        expect(html).toContain('FAQPage');
        expect(html).toContain('HowTo');
    });

    it('falls back to promptCategory when source category is unavailable', async () => {
        const pageModule = await import('@/app/prompts/scenarios/[slug]/page');

        await pageModule.default({
            params: Promise.resolve({ slug: 'image-concepts' }),
        });

        expect(mockGetPagedPrompts).toHaveBeenCalledWith(1, 12, 'image-generation', undefined);
    });

    it('keeps scenario index pages reachable without surfacing them as prompt-list entry modules', async () => {
        const scenarioIndexPage = await import('@/app/prompts/scenarios/page');
        const promptsPage = await import('@/app/prompts/page');

        const scenarioIndexElement = await scenarioIndexPage.default();
        const promptsElement = await promptsPage.default({
            searchParams: Promise.resolve({}),
        });
        const scenarioIndexHtml = renderToStaticMarkup(scenarioIndexElement as React.ReactElement);
        const promptsHtml = renderToStaticMarkup(promptsElement as React.ReactElement);

        expect(scenarioIndexPage.metadata.alternates?.canonical).toBe('/prompts/scenarios');
        expect(scenarioIndexHtml).toContain('/prompts/scenarios/video-generation');
        expect(promptsHtml).not.toContain('提示词专题入口');
        expect(promptsHtml).not.toContain('热门提示词场景');
        expect(promptsHtml).not.toContain('/prompts/scenarios/video-generation');
    });
});
