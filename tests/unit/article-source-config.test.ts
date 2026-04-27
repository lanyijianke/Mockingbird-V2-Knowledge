import { afterEach, describe, expect, it } from 'vitest';
import { loadArticleSourceConfigs } from '@/lib/articles/source-config';

const ORIGINAL_ENV = process.env.ARTICLE_LOCAL_SOURCES;

describe('article source config', () => {
    afterEach(() => {
        if (typeof ORIGINAL_ENV === 'string') {
            process.env.ARTICLE_LOCAL_SOURCES = ORIGINAL_ENV;
        } else {
            delete process.env.ARTICLE_LOCAL_SOURCES;
        }
    });

    it('loads multiple local article sources from ARTICLE_LOCAL_SOURCES', () => {
        process.env.ARTICLE_LOCAL_SOURCES = JSON.stringify([
            {
                site: 'ai',
                source: 'web-article',
                rootPath: '/data/content/web-article',
                manifestPath: 'manifest.json',
            },
            {
                site: 'finance',
                source: 'finance-digest',
                rootPath: '/data/content/finance-digest',
                manifestPath: 'manifest.json',
            },
        ]);

        expect(loadArticleSourceConfigs()).toEqual([
            {
                site: 'ai',
                source: 'web-article',
                rootPath: '/data/content/web-article',
                manifestPath: 'manifest.json',
            },
            {
                site: 'finance',
                source: 'finance-digest',
                rootPath: '/data/content/finance-digest',
                manifestPath: 'manifest.json',
            },
        ]);
    });

    it('rejects duplicate site/source pairs', () => {
        process.env.ARTICLE_LOCAL_SOURCES = JSON.stringify([
            {
                site: 'ai',
                source: 'web-article',
                rootPath: '/data/content/web-article',
                manifestPath: 'manifest.json',
            },
            {
                site: 'ai',
                source: 'web-article',
                rootPath: '/data/content/web-article-copy',
                manifestPath: 'manifest.json',
            },
        ]);

        expect(() => loadArticleSourceConfigs()).toThrow(/duplicate article source/i);
    });
});
