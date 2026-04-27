import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockScrapeGitHubTrending = vi.fn();
const mockScrapeProductHunt = vi.fn();
const mockScrapeSkillsSh = vi.fn();

vi.mock('@/lib/services/ranking-scrapers', () => ({
    scrapeGitHubTrending: mockScrapeGitHubTrending,
    scrapeProductHunt: mockScrapeProductHunt,
    scrapeSkillsSh: mockScrapeSkillsSh,
}));

vi.mock('@/lib/utils/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        persist: vi.fn(),
    },
}));

const githubFixture = [
    {
        id: 1,
        rank: 1,
        repoFullName: 'openai/codex',
        description: 'Build with agents',
        language: 'TypeScript',
        starsCount: 100,
        forksCount: 10,
        todayStars: 20,
        repoUrl: 'https://github.com/openai/codex',
        sourcePlatform: 'github',
        updatedAt: '2026-04-22T10:00:00.000Z',
    },
];

describe('ranking cache', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('caches ranking reads behind the shared cache manager', async () => {
        mockScrapeGitHubTrending.mockResolvedValue(githubFixture);

        const { getGitHubTrendings } = await import('@/lib/services/ranking-cache');

        await expect(getGitHubTrendings()).resolves.toEqual(githubFixture);
        await expect(getGitHubTrendings()).resolves.toEqual(githubFixture);

        expect(mockScrapeGitHubTrending).toHaveBeenCalledTimes(1);
    });

    it('keeps the last successful ranking payload when refresh returns an empty list', async () => {
        mockScrapeGitHubTrending
            .mockResolvedValueOnce(githubFixture)
            .mockResolvedValueOnce([]);
        mockScrapeProductHunt.mockResolvedValue([]);
        mockScrapeSkillsSh.mockResolvedValue([]);

        const { getGitHubTrendings, refreshAllRankings } = await import('@/lib/services/ranking-cache');

        await expect(getGitHubTrendings()).resolves.toEqual(githubFixture);
        await expect(refreshAllRankings()).resolves.toBeUndefined();
        await expect(getGitHubTrendings()).resolves.toEqual(githubFixture);
    });
});
