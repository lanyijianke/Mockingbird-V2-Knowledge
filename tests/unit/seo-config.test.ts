import { afterEach, describe, expect, it } from 'vitest';

const ORIGINAL_SITE_URL = process.env.SITE_URL;
const ORIGINAL_CAN_INDEX = process.env.SEO_CAN_INDEX;

describe('getSiteSeoConfig', () => {
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

    it('reads site url and indexing state from env without falling back to aigcclub.com.cn', async () => {
        process.env.SITE_URL = 'https://kb.example.com';
        process.env.SEO_CAN_INDEX = 'false';

        const { getSiteSeoConfig } = await import('@/lib/seo/config');
        const config = getSiteSeoConfig();

        expect(config.siteUrl).toBe('https://kb.example.com');
        expect(config.canIndex).toBe(false);
        expect(config.defaultTitle).toBe('知更鸟知识库 - AI 教程 | AI 实践 | AI 提示词 | AI 工具');
    });

    it('builds absolute urls from the configured origin', async () => {
        process.env.SITE_URL = 'https://kb.example.com';

        const { buildAbsoluteUrl } = await import('@/lib/seo/config');

        expect(buildAbsoluteUrl('/prompts?category=gemini-3')).toBe('https://kb.example.com/prompts?category=gemini-3');
    });
});
