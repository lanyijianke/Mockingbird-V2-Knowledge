import { describe, expect, it, vi } from 'vitest';
import {
    activatePromptCardPreview,
    deactivatePromptCardPreview,
    resolvePromptCardPreviewUrl,
} from '@/app/prompts/prompt-card-preview';

function createVideoStub() {
    return {
        currentTime: 12,
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
    };
}

describe('prompt card preview controls', () => {
    it('prefers the lightweight card preview asset over the full detail video', () => {
        expect(
            resolvePromptCardPreviewUrl('/content/prompts/media/demo.card.mp4', '/content/prompts/media/demo.mp4')
        ).toBe('/content/prompts/media/demo.card.mp4');
    });

    it('falls back to the full video when a legacy prompt does not have a card preview asset yet', () => {
        expect(
            resolvePromptCardPreviewUrl(null, '/content/prompts/media/demo.mp4')
        ).toBe('/content/prompts/media/demo.mp4');
    });

    it('starts playback for mouse hover previews', async () => {
        const video = createVideoStub();

        await expect(activatePromptCardPreview(video, 'mouse', true)).resolves.toBe(true);
        expect(video.play).toHaveBeenCalledTimes(1);
    });

    it('ignores non-mouse pointers for hover previews', async () => {
        const video = createVideoStub();

        await expect(activatePromptCardPreview(video, 'touch', true)).resolves.toBe(false);
        expect(video.play).not.toHaveBeenCalled();
    });

    it('ignores hover preview requests on devices without hover capability', async () => {
        const video = createVideoStub();

        await expect(activatePromptCardPreview(video, 'mouse', false)).resolves.toBe(false);
        expect(video.play).not.toHaveBeenCalled();
    });

    it('pauses and rewinds the preview when hover ends', () => {
        const video = createVideoStub();

        deactivatePromptCardPreview(video);

        expect(video.pause).toHaveBeenCalledTimes(1);
        expect(video.currentTime).toBe(0);
    });
});
