import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import PromptGalleryCard from '@/app/prompts/PromptGalleryCard';

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

function renderPromptCard(overrides: Partial<React.ComponentProps<typeof PromptGalleryCard>> = {}) {
    return renderToStaticMarkup(
        React.createElement(PromptGalleryCard, {
            href: '/prompts/7',
            title: '测试提示词',
            categoryName: '多模态提示词',
            copyCount: 321,
            coverImageUrl: '/content/prompts/media/cover.webp',
            cardPreviewVideoUrl: null,
            videoPreviewUrl: null,
            animationDelay: '0s',
            ...overrides,
        })
    );
}

describe('PromptGalleryCard', () => {
    it('renders the explicit video badge when a card preview video is available', () => {
        const html = renderPromptCard({ cardPreviewVideoUrl: '/content/prompts/media/demo.card.mp4' });

        expect(html).toContain('pc2-video-badge');
        expect(html).not.toContain('<video');
    });

    it('keeps the video badge for legacy prompts that only have a full video asset', () => {
        const html = renderPromptCard({ videoPreviewUrl: '/content/prompts/media/demo.mp4' });

        expect(html).toContain('pc2-video-badge');
    });

    it('omits the video badge when no video asset is available', () => {
        const html = renderPromptCard();

        expect(html).not.toContain('pc2-video-badge');
        expect(html).not.toContain('<video');
    });
});
