import { describe, expect, it } from 'vitest';

import {
    getPromptScenarioPageBySlug,
    getPromptScenarioPages,
    getRankingTopicPageBySlug,
    getRankingTopicPages,
} from '@/lib/seo/growth-pages';
import { buildFaqPageJsonLd, buildHowToJsonLd } from '@/lib/seo/schema';

describe('growth page definitions', () => {
    it('exposes prompt scenario pages with stable slug contract and sourcing metadata', () => {
        const pages = getPromptScenarioPages();

        expect(pages.length).toBeGreaterThan(0);
        expect(pages.map((page) => page.slug)).toContain('video-generation');

        const scenario = getPromptScenarioPageBySlug('video-generation');

        expect(scenario).toMatchObject({
            slug: 'video-generation',
            canonicalPath: '/prompts/scenarios/video-generation',
            promptCategory: 'video-generation',
            promptSourceCategory: 'gemini-3',
        });
        expect(
            scenario?.blocks.find((block) => block.type === 'stats')?.items[0]?.sourceUrl
        ).toBe('/prompts');
        expect(scenario?.blocks.map((block) => block.type)).toEqual([
            'definition',
            'faq',
            'comparison',
            'steps',
            'stats',
        ]);
    });

    it('exposes ranking topic pages backed by existing ranking sources', () => {
        const pages = getRankingTopicPages();

        expect(pages.map((page) => page.slug)).toContain('ai-launches-producthunt');

        const topic = getRankingTopicPageBySlug('ai-launches-producthunt');

        expect(topic).toMatchObject({
            slug: 'ai-launches-producthunt',
            canonicalPath: '/rankings/topics/ai-launches-producthunt',
            rankingSource: 'producthunt',
        });
    });

    it('builds FAQ and HowTo schema blocks from structured inputs', () => {
        expect(
            buildFaqPageJsonLd([
                {
                    question: 'What is a prompt scenario page?',
                    answer: 'A landing page for one prompt use case.',
                },
            ])
        ).toMatchObject({
            '@type': 'FAQPage',
            mainEntity: [
                {
                    '@type': 'Question',
                    name: 'What is a prompt scenario page?',
                },
            ],
        });

        expect(
            buildHowToJsonLd(
                'Use a prompt scenario page',
                'Turn a prompt category into a reusable SEO page.',
                'https://kb.example.com/prompts/scenarios/video-generation',
                [
                    {
                        name: 'Pick a scenario',
                        text: 'Choose a prompt scenario backed by real prompts.',
                    },
                    {
                        name: 'Review examples',
                        text: 'Read the prompt examples on the page.',
                    },
                ]
            )
        ).toMatchObject({
            '@type': 'HowTo',
            name: 'Use a prompt scenario page',
            step: [
                { '@type': 'HowToStep', name: 'Pick a scenario' },
                { '@type': 'HowToStep', name: 'Review examples' },
            ],
        });
    });
});
