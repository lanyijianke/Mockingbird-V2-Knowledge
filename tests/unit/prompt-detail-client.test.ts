import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import PromptDetailClient from '@/app/prompts/[id]/PromptDetailClient';

vi.mock('next/image', async () => {
    const ReactModule = await import('react');

    return {
        default: (props: Record<string, unknown>) => ReactModule.createElement('img', props),
    };
});

vi.mock('next/link', async () => {
    const ReactModule = await import('react');

    return {
        default: ({
            href,
            children,
            ...props
        }: {
            href: string;
            children: React.ReactNode;
        }) => ReactModule.createElement('a', { href, ...props }, children),
    };
});

function renderPromptDetail(overrides: Partial<React.ComponentProps<typeof PromptDetailClient>> = {}) {
    return renderToStaticMarkup(
        React.createElement(PromptDetailClient, {
            images: ['/content/prompts/media/cover.webp'],
            content: 'test prompt content',
            videoUrl: null,
            title: '测试提示词',
            categoryName: '多模态提示词',
            description: 'desc',
            author: 'author',
            copyCount: 1,
            dateStr: '2026年4月22日',
            sourceUrl: 'https://x.com/example/status/1',
            isJson: false,
            relatedPrompts: [],
            ...overrides,
        })
    );
}

describe('PromptDetailClient', () => {
    it('shows an explicit image-only notice when no playable video is available', () => {
        const html = renderPromptDetail();

        expect(html).toContain('源数据暂未提供可播放视频，当前仅展示封面图');
        expect(html).not.toContain('<video');
    });

    it('renders the video player and hides the fallback notice when a video is available', () => {
        const html = renderPromptDetail({ videoUrl: '/content/prompts/media/demo.mp4' });

        expect(html).toContain('<video');
        expect(html).not.toContain('源数据暂未提供可播放视频，当前仅展示封面图');
    });
});
