import { describe, expect, it } from 'vitest';
import { cachePageRevalidate } from '@/lib/cache/policies';

describe('page cache policy alignment', () => {
    it('keeps route segment revalidate exports aligned with centralized cache settings', async () => {
        const homePage = await import('@/app/page');
        const promptDetailPage = await import('@/app/prompts/[id]/page');
        const aiArticlePage = await import('@/app/ai/articles/[slug]/page');
        const financeArticlePage = await import('@/app/finance/articles/[slug]/page');
        const githubRankingPage = await import('@/app/rankings/github/page');
        const productHuntRankingPage = await import('@/app/rankings/producthunt/page');
        const skillsTrendingPage = await import('@/app/rankings/skills-trending/page');
        const skillsHotPage = await import('@/app/rankings/skills-hot/page');

        expect(homePage.revalidate).toBe(cachePageRevalidate.home);
        expect(promptDetailPage.revalidate).toBe(cachePageRevalidate.promptDetail);
        expect(aiArticlePage.revalidate).toBe(cachePageRevalidate.articleDetail);
        expect(financeArticlePage.revalidate).toBe(cachePageRevalidate.articleDetail);
        expect(githubRankingPage.revalidate).toBe(cachePageRevalidate.rankings);
        expect(productHuntRankingPage.revalidate).toBe(cachePageRevalidate.rankings);
        expect(skillsTrendingPage.revalidate).toBe(cachePageRevalidate.rankings);
        expect(skillsHotPage.revalidate).toBe(cachePageRevalidate.rankings);
    });
});
