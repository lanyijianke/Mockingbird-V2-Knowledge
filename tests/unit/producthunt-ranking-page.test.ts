import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetProductHuntRankings = vi.fn();

vi.mock('@/lib/services/ranking-cache', () => ({
    getProductHuntRankings: mockGetProductHuntRankings,
}));

describe('ProductHunt ranking page', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        mockGetProductHuntRankings.mockResolvedValue([
            {
                id: 1,
                rank: 1,
                title: 'Test Product',
                tagline: 'Ship faster',
                votesCount: 42,
                productUrl: 'https://example.com/product',
                thumbnailUrl: 'https://ph-files.imgix.net/test-thumb.png?auto=format',
                sourcePlatform: 'ProductHunt',
                updatedAt: '2026-04-22T00:00:00.000Z',
            },
        ]);
    });

    it('renders ProductHunt thumbnails without going through next image optimization', async () => {
        const pageModule = await import('@/app/rankings/producthunt/page');
        const element = await pageModule.default();
        const html = renderToStaticMarkup(element as React.ReactElement);

        expect(html).toContain('<img');
        expect(html).toContain('https://ph-files.imgix.net/test-thumb.png?auto=format');
        expect(html).not.toContain('/_next/image');
        expect(html).toContain('热榜解读与延伸探索');
        expect(html).toContain('/rankings/github');
        expect(html).toContain('/prompts');
    });
});
