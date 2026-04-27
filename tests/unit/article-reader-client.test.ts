import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ArticleReaderClient from '@/app/articles/[slug]/ArticleReaderClient';

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

function renderArticleReader() {
    return renderToStaticMarkup(
        React.createElement(ArticleReaderClient, {
            renderedHtml: '<p>article body</p>',
            toc: [],
            title: '测试文章',
            categoryName: 'AI',
            dateStr: '2026年4月24日',
            readingMinutes: 3,
            summary: 'summary',
            articleUrl: 'https://example.com/ai/articles/test',
            backHref: '/ai/articles',
            relatedArticles: [],
        })
    );
}

describe('ArticleReaderClient', () => {
    it('renders a floating back link to the article list near the top of the reader', () => {
        const html = renderArticleReader();

        expect(html).toContain('class="reader-back-float"');
        expect(html).toContain('href="/ai/articles"');
        expect(html).toContain('aria-label="返回文章列表"');
    });
});
