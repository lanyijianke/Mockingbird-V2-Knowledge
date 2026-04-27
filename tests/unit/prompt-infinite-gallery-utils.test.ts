import { describe, expect, it } from 'vitest';
import {
    buildPromptGalleryResetKey,
    buildPromptPageApiUrl,
    hasNextPromptPage,
} from '@/app/prompts/infinite-gallery-utils';

describe('prompt infinite gallery utils', () => {
    it('builds the next page API URL while preserving category and search filters', () => {
        expect(buildPromptPageApiUrl({
            page: 2,
            pageSize: 20,
            category: 'gpt-image-2',
            q: 'poster prompt',
        })).toBe('/api/prompts?page=2&pageSize=20&category=gpt-image-2&q=poster+prompt');
    });

    it('detects when the gallery can request another page', () => {
        expect(hasNextPromptPage(1, 3)).toBe(true);
        expect(hasNextPromptPage(3, 3)).toBe(false);
    });

    it('builds a reset key that changes when filters change', () => {
        expect(buildPromptGalleryResetKey({ category: 'gpt-image-2', q: undefined })).toBe('gpt-image-2::');
        expect(buildPromptGalleryResetKey({ category: 'gemini-3', q: undefined })).toBe('gemini-3::');
        expect(buildPromptGalleryResetKey({ category: 'gemini-3', q: 'poster' })).toBe('gemini-3::poster');
        expect(buildPromptGalleryResetKey({ category: undefined, q: undefined })).toBe('all::');
    });
});
