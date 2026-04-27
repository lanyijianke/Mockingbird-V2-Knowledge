import { describe, expect, it } from 'vitest';
import {
    buildArticleInternalLinkGroup,
    buildPromptInternalLinkGroup,
    buildRankingInternalLinkGroup,
    buildSeoInternalLinkGroups,
} from '@/lib/seo/internal-links';

describe('seo internal links', () => {
    it('builds typed internal link groups for article, prompt, and ranking surfaces', () => {
        const article = buildArticleInternalLinkGroup({
            site: 'ai',
            categorySlug: 'agent-memory',
            categoryLabel: 'Agent Memory',
            articleSlug: 'prompt-caching',
            articleTitle: 'Prompt Caching',
        });

        const prompt = buildPromptInternalLinkGroup({
            categorySlug: 'gemini-3',
            categoryLabel: 'Gemini 3',
            promptId: 42,
            promptTitle: 'Gemini Video Prompt',
        });

        const rankings = buildRankingInternalLinkGroup();

        expect(article).toEqual({
            kind: 'article',
            title: '相关文章',
            links: [
                {
                    id: 'article-list',
                    href: '/ai/articles',
                    label: '全部 AI 文章',
                    description: '返回 AI 文章栏目，继续浏览更多分类与长文。',
                },
                {
                    id: 'article-category',
                    href: '/ai/articles/categories/agent-memory',
                    label: 'Agent Memory 文章',
                    description: '进入 Agent Memory 分类落地页，集中浏览同主题内容。',
                },
                {
                    id: 'article-detail',
                    href: '/ai/articles/prompt-caching',
                    label: 'Prompt Caching',
                    description: '回到当前文章详情页。',
                },
            ],
        });

        expect(prompt).toEqual({
            kind: 'prompt',
            title: '相关提示词',
            links: [
                {
                    id: 'prompt-list',
                    href: '/prompts',
                    label: '全部提示词',
                    description: '浏览全部提示词，按模型与场景继续筛选。',
                },
                {
                    id: 'prompt-category',
                    href: '/prompts/categories/gemini-3',
                    label: 'Gemini 3 提示词',
                    description: '进入 Gemini 3 分类页，查看同类提示词合集。',
                },
                {
                    id: 'prompt-scenarios',
                    href: '/prompts/scenarios',
                    label: '提示词场景库',
                    description: '进入场景化提示词入口，按任务浏览提示词组合。',
                },
                {
                    id: 'prompt-detail',
                    href: '/prompts/42',
                    label: 'Gemini Video Prompt',
                    description: '回到当前提示词详情页。',
                },
            ],
        });

        expect(rankings).toEqual({
            kind: 'ranking',
            title: '相关热榜',
            links: [
                {
                    id: 'ranking-github',
                    href: '/rankings/github',
                    label: 'GitHub Trending',
                    description: '查看开源项目热度变化。',
                },
                {
                    id: 'ranking-producthunt',
                    href: '/rankings/producthunt',
                    label: 'ProductHunt',
                    description: '查看新产品发布热度。',
                },
                {
                    id: 'ranking-skills-trending',
                    href: '/rankings/skills-trending',
                    label: 'Skills Trending',
                    description: '查看技能与工具的趋势热度。',
                },
                {
                    id: 'ranking-skills-hot',
                    href: '/rankings/skills-hot',
                    label: 'Skills Hot',
                    description: '查看技能与工具的短期爆发热度。',
                },
            ],
        });
    });

    it('aggregates only the requested groups while preserving typed output', () => {
        const groups = buildSeoInternalLinkGroups({
            article: {
                site: 'finance',
                categorySlug: 'macro',
                categoryLabel: 'Macro',
                articleSlug: 'fed-notes',
                articleTitle: 'Fed Notes',
            },
            rankings: true,
        });

        expect(groups.article?.links.map((link) => link.href)).toEqual([
            '/finance/articles',
            '/finance/articles/categories/macro',
            '/finance/articles/fed-notes',
        ]);
        expect(groups.prompt).toBeUndefined();
        expect(groups.ranking?.links).toHaveLength(4);
    });
});
