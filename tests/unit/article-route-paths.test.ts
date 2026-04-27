import { describe, expect, it } from 'vitest';
import {
    getArticleCategoryLandingPath,
    getArticleDetailPath,
    getArticleListPath,
} from '@/lib/articles/article-route-paths';

describe('article route paths', () => {
    it('builds canonical site-aware paths for AI and finance articles', () => {
        expect(getArticleListPath('ai')).toBe('/ai/articles');
        expect(getArticleDetailPath('ai', 'prompt-caching')).toBe('/ai/articles/prompt-caching');
        expect(getArticleCategoryLandingPath('ai', 'tech-practice')).toBe('/ai/articles/categories/tech-practice');
        expect(getArticleListPath('finance')).toBe('/finance/articles');
        expect(getArticleDetailPath('finance', 'fed-notes')).toBe('/finance/articles/fed-notes');
        expect(getArticleCategoryLandingPath('finance', 'macro')).toBe('/finance/articles/categories/macro');
    });
});
