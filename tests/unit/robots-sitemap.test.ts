import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetArticleSitemapEntries = vi.fn();
const mockGetPromptSitemapEntries = vi.fn();

vi.mock('@/lib/services/article-service', () => ({
    getArticleSitemapEntries: mockGetArticleSitemapEntries,
}));

vi.mock('@/lib/services/prompt-service', () => ({
    getPromptSitemapEntries: mockGetPromptSitemapEntries,
}));

const ORIGINAL_SITE_URL = process.env.SITE_URL;
const ORIGINAL_BLOCK_BAIDU = process.env.ROBOTS_BLOCK_BAIDU;
const ORIGINAL_SITEMAP_CHUNK_SIZE = process.env.SITEMAP_CHUNK_SIZE;
const ORIGINAL_CAN_INDEX = process.env.SEO_CAN_INDEX;

function asRuleArray(
    rules: { userAgent?: string | string[]; allow?: string | string[]; disallow?: string | string[] } |
    Array<{ userAgent?: string | string[]; allow?: string | string[]; disallow?: string | string[] }>,
) {
    return Array.isArray(rules) ? rules : [rules];
}

describe('robots config', () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.SITE_URL = 'https://kb.example.com';
        process.env.SEO_CAN_INDEX = 'true';
        delete process.env.ROBOTS_BLOCK_BAIDU;
    });

    it('allows Baidu when ROBOTS_BLOCK_BAIDU is false/unset', async () => {
        const { default: robots } = await import('@/app/robots');
        const config = robots();
        const rules = asRuleArray(config.rules);
        const baiduRule = rules.find((rule) => rule.userAgent === 'Baiduspider');

        expect(baiduRule).toBeDefined();
        expect(baiduRule?.allow).toBe('/');
        expect(baiduRule?.disallow).toEqual(['/api/']);
        expect(config.sitemap).toBe('https://kb.example.com/sitemap.xml');
    });

    it('blocks Baidu when ROBOTS_BLOCK_BAIDU=true', async () => {
        process.env.ROBOTS_BLOCK_BAIDU = 'true';
        const { default: robots } = await import('@/app/robots');
        const config = robots();
        const rules = asRuleArray(config.rules);
        const baiduRule = rules.find((rule) => rule.userAgent === 'Baiduspider');

        expect(baiduRule).toBeDefined();
        expect(baiduRule?.disallow).toBe('/');
    });

    it('disallows all crawling and omits sitemap when SEO_CAN_INDEX=false', async () => {
        process.env.SEO_CAN_INDEX = 'false';

        const { default: robots } = await import('@/app/robots');
        const config = robots();
        const rules = asRuleArray(config.rules);

        expect(rules[0]).toMatchObject({
            userAgent: '*',
            disallow: '/',
        });
        expect(config.sitemap).toBeUndefined();
    });
});

describe('sitemap generation', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        process.env.SITE_URL = 'https://kb.example.com';
        process.env.SEO_CAN_INDEX = 'true';
        process.env.SITEMAP_CHUNK_SIZE = '2';
    });

    it('builds sitemap index urls with chunked article/prompt sitemaps', async () => {
        mockGetArticleSitemapEntries.mockResolvedValue([
            { site: 'ai', slug: 'a-1', path: '/ai/articles/a-1', lastModified: '2026-03-01T00:00:00.000Z' },
            { site: 'ai', slug: 'a-2', path: '/ai/articles/a-2', lastModified: '2026-03-01T00:00:00.000Z' },
            { site: 'finance', slug: 'a-3', path: '/finance/articles/a-3', lastModified: '2026-03-01T00:00:00.000Z' },
        ]);
        mockGetPromptSitemapEntries.mockResolvedValue([
            { id: 11, lastModified: '2026-03-02T00:00:00.000Z' },
            { id: 12, lastModified: '2026-03-02T00:00:00.000Z' },
            { id: 13, lastModified: '2026-03-02T00:00:00.000Z' },
        ]);

        const { buildSitemapIndexUrls } = await import('@/lib/services/sitemap-service');
        const urls = await buildSitemapIndexUrls();

        expect(urls).toContain('https://kb.example.com/sitemaps/static.xml');
        expect(urls).toContain('https://kb.example.com/sitemaps/articles-1.xml');
        expect(urls).toContain('https://kb.example.com/sitemaps/articles-2.xml');
        expect(urls).toContain('https://kb.example.com/sitemaps/prompts-1.xml');
        expect(urls).toContain('https://kb.example.com/sitemaps/prompts-2.xml');
    });

    it('uses content updated time for dynamic chunk entries', async () => {
        mockGetArticleSitemapEntries.mockResolvedValue([
            { site: 'ai', slug: 'alpha', path: '/ai/articles/alpha', lastModified: '2026-03-01T00:00:00.000Z' },
        ]);
        mockGetPromptSitemapEntries.mockResolvedValue([
            { id: 42, lastModified: '2026-03-02T00:00:00.000Z' },
        ]);

        const { buildSitemapChunkEntries } = await import('@/lib/services/sitemap-service');
        const articleEntries = await buildSitemapChunkEntries('articles-1');
        const promptEntries = await buildSitemapChunkEntries('prompts-1');

        expect(articleEntries?.[0]?.url).toBe('https://kb.example.com/ai/articles/alpha');
        expect(articleEntries?.[0]?.lastModified).toBe('2026-03-01T00:00:00.000Z');
        expect(promptEntries?.[0]?.url).toBe('https://kb.example.com/prompts/42');
        expect(promptEntries?.[0]?.lastModified).toBe('2026-03-02T00:00:00.000Z');
    });

    it('falls back to current time when lastModified is invalid', async () => {
        mockGetArticleSitemapEntries.mockResolvedValue([
            { site: 'ai', slug: 'broken-date', path: '/ai/articles/broken-date', lastModified: 'not-a-date' },
        ]);
        mockGetPromptSitemapEntries.mockResolvedValue([]);

        const { buildSitemapChunkEntries } = await import('@/lib/services/sitemap-service');
        const entries = await buildSitemapChunkEntries('articles-1');

        expect(entries).toBeDefined();
        expect(String(entries?.[0]?.lastModified)).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });

    it('includes growth page families in the static sitemap entries', async () => {
        mockGetArticleSitemapEntries.mockResolvedValue([]);
        mockGetPromptSitemapEntries.mockResolvedValue([]);

        const { buildSitemapChunkEntries } = await import('@/lib/services/sitemap-service');
        const entries = await buildSitemapChunkEntries('static');
        const urls = (entries || []).map((entry) => entry.url);

        expect(urls).toContain('https://kb.example.com/prompts/scenarios');
        expect(urls).toContain('https://kb.example.com/prompts/scenarios/video-generation');
        expect(urls).toContain('https://kb.example.com/rankings/topics');
        expect(urls).toContain('https://kb.example.com/rankings/topics/ai-launches-producthunt');
    });

    it('returns no sitemap index urls in protected mode', async () => {
        process.env.SEO_CAN_INDEX = 'false';

        const { buildSitemapIndexUrls, buildSitemapChunkEntries } = await import('@/lib/services/sitemap-service');

        await expect(buildSitemapIndexUrls()).resolves.toEqual([]);
        await expect(buildSitemapChunkEntries('static')).resolves.toEqual([]);
    });
});

afterEach(() => {
    if (ORIGINAL_SITE_URL === undefined) {
        delete process.env.SITE_URL;
    } else {
        process.env.SITE_URL = ORIGINAL_SITE_URL;
    }

    if (ORIGINAL_BLOCK_BAIDU === undefined) {
        delete process.env.ROBOTS_BLOCK_BAIDU;
    } else {
        process.env.ROBOTS_BLOCK_BAIDU = ORIGINAL_BLOCK_BAIDU;
    }

    if (ORIGINAL_SITEMAP_CHUNK_SIZE === undefined) {
        delete process.env.SITEMAP_CHUNK_SIZE;
    } else {
        process.env.SITEMAP_CHUNK_SIZE = ORIGINAL_SITEMAP_CHUNK_SIZE;
    }

    if (ORIGINAL_CAN_INDEX === undefined) {
        delete process.env.SEO_CAN_INDEX;
    } else {
        process.env.SEO_CAN_INDEX = ORIGINAL_CAN_INDEX;
    }
});
