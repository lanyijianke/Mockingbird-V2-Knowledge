import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validateOutboundUrl } from '@/lib/utils/url-security';

const ORIGINAL_SITE_URL = process.env.SITE_URL;

describe('url-security', () => {
    it('rejects malformed URL', async () => {
        const result = await validateOutboundUrl('not-a-url');
        expect(result.ok).toBe(false);
    });

    it('rejects unsupported protocol', async () => {
        const result = await validateOutboundUrl('file:///etc/passwd');
        expect(result.ok).toBe(false);
    });

    it('rejects localhost', async () => {
        const result = await validateOutboundUrl('http://localhost:8080/file.png');
        expect(result.ok).toBe(false);
    });

    it('rejects private IPv4', async () => {
        const result = await validateOutboundUrl('http://192.168.1.10/private.png');
        expect(result.ok).toBe(false);
    });

    it('allows public literal IPv4 URL', async () => {
        const result = await validateOutboundUrl('https://8.8.8.8/resource.png');
        expect(result.ok).toBe(true);
    });
});

describe('json-ld serialization', () => {
    it('escapes dangerous script-breaking characters', async () => {
        const { serializeJsonLd } = await import('@/lib/seo/schema');
        const payload = {
            '@context': 'https://schema.org',
            name: '</script><script>alert(1)</script>&',
        };

        const json = serializeJsonLd(payload);
        expect(json).not.toContain('</script>');
        expect(json).toContain('\\u003c');
        expect(json).toContain('\\u003e');
        expect(json).toContain('\\u0026');
    });
});

describe('json-ld builders', () => {
    beforeEach(() => {
        vi.resetModules();
        process.env.SITE_URL = 'https://kb.example.com';
    });

    afterEach(() => {
        if (ORIGINAL_SITE_URL === undefined) {
            delete process.env.SITE_URL;
        } else {
            process.env.SITE_URL = ORIGINAL_SITE_URL;
        }
    });

    it('builds organization and webpage schemas', async () => {
        const { buildOrganizationJsonLd, buildWebPageJsonLd } = await import('@/lib/seo/schema');
        const organization = buildOrganizationJsonLd() as Record<string, unknown>;
        const webPage = buildWebPageJsonLd(
            '首页',
            '首页描述',
            'https://kb.example.com',
        ) as Record<string, unknown>;

        expect(organization['@type']).toBe('Organization');
        expect(organization.name).toBe('知更鸟知识库');
        expect(organization.url).toBe('https://kb.example.com');
        expect(webPage['@type']).toBe('WebPage');
        expect(webPage.url).toBe('https://kb.example.com');
        expect((webPage.isPartOf as Record<string, unknown>).url).toBe('https://kb.example.com');
    });

    it('builds item list schema with sequential positions', async () => {
        const { buildItemListJsonLd } = await import('@/lib/seo/schema');
        const itemList = buildItemListJsonLd(
            '测试榜单',
            '测试描述',
            'https://kb.example.com/rankings/test',
            [
                { name: 'A', url: 'https://example.com/a' },
                { name: 'B', url: null },
            ],
        ) as {
            '@type': string;
            itemListElement: Array<{ position: number; name: string; url?: string }>;
        };

        expect(itemList['@type']).toBe('ItemList');
        expect(itemList.itemListElement).toHaveLength(2);
        expect(itemList.itemListElement[0].position).toBe(1);
        expect(itemList.itemListElement[1].position).toBe(2);
        expect(itemList.itemListElement[0].url).toBe('https://example.com/a');
    });

    it('builds prompt object schema with absolute main entity url and prompt text', async () => {
        const { buildPromptJsonLd } = await import('@/lib/seo/schema');
        const schema = buildPromptJsonLd({
            id: 42,
            title: 'Gemini 视频分镜提示词',
            description: '适用于短视频分镜、镜头语言与运动控制。',
            content: '镜头 1：广角航拍，晨雾穿过山谷。',
            coverImageUrl: 'https://cdn.example.com/prompt.png',
            category: 'Gemini 3',
            tags: ['video', 'storyboard'],
            createdAt: '2026-04-01T00:00:00.000Z',
            updatedAt: '2026-04-02T00:00:00.000Z',
        }) as Record<string, unknown>;

        expect(schema['@type']).toBe('CreativeWork');
        expect(schema.name).toBe('Gemini 视频分镜提示词');
        expect(schema.url).toBe('https://kb.example.com/prompts/42');
        expect(schema.text).toBe('镜头 1：广角航拍，晨雾穿过山谷。');
        expect(schema.image).toBe('https://cdn.example.com/prompt.png');
        expect(schema.genre).toBe('Gemini 3');
        expect(schema.keywords).toEqual(['video', 'storyboard']);
        expect((schema.mainEntityOfPage as Record<string, unknown>)['@id']).toBe('https://kb.example.com/prompts/42');
        expect((schema.isPartOf as Record<string, unknown>).url).toBe('https://kb.example.com');
        expect((schema.author as Record<string, unknown>).url).toBe('https://kb.example.com');
    });
});
