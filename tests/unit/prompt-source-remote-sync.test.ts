import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQueryOne = vi.fn();
const mockExecute = vi.fn();
const mockDownloadMedia = vi.fn();
const mockDownloadVideoViaYtDlp = vi.fn();
const mockCreateCardPreviewVideo = vi.fn();
const mockExtractFirstFrame = vi.fn();

vi.mock('@/lib/db', () => ({
    queryOne: mockQueryOne,
    execute: mockExecute,
}));

vi.mock('@/lib/pipelines/media-pipeline', () => ({
    downloadMedia: mockDownloadMedia,
    downloadVideoViaYtDlp: mockDownloadVideoViaYtDlp,
    getMediaDir: () => '/tmp/prompt-media',
}));

vi.mock('@/lib/utils/media-processor', () => ({
    createCardPreviewVideo: mockCreateCardPreviewVideo,
    extractFirstFrame: mockExtractFirstFrame,
}));

vi.mock('@/lib/utils/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        persist: vi.fn(),
    },
}));

describe('prompt remote source sync runner', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCreateCardPreviewVideo.mockResolvedValue(null);
        mockExtractFirstFrame.mockResolvedValue(null);
    });

    it('imports normalized records through the existing Prompts table shape', async () => {
        mockQueryOne.mockResolvedValue(null);
        mockDownloadMedia.mockResolvedValue('/content/prompts/media/cat.webp');
        mockExecute.mockResolvedValue({ affectedRows: 1 });

        const { syncPromptSourceRecords } = await import('@/lib/pipelines/prompt-sources/remote-sync');
        const report = await syncPromptSourceRecords(
            {
                id: 'test-source',
                type: 'github-readme',
                defaultCategory: 'gpt-image-2',
                enabled: true,
            },
            [
                {
                    externalId: 'test-source:no-1',
                    title: 'Cat Portrait',
                    rawTitle: 'Cat Portrait',
                    description: 'A cat prompt',
                    content: 'Draw a cat',
                    category: 'gpt-image-2',
                    author: 'Author',
                    sourceUrl: 'https://example.com/cat',
                    mediaUrls: ['https://example.com/cat.jpg'],
                    videoUrls: [],
                    flags: ['raycast'],
                    metadata: { sourceId: 'test-source' },
                },
            ]
        );

        expect(report).toMatchObject({
            totalParsed: 1,
            newlyAdded: 1,
            updated: 0,
            skipped: 0,
        });
        expect(mockExecute).toHaveBeenCalledTimes(1);
        expect(mockExecute.mock.calls[0][0]).toContain('INSERT INTO Prompts');
        expect(mockExecute.mock.calls[0][1]).toContain('Cat Portrait');
        expect(mockExecute.mock.calls[0][1]).toContain('gpt-image-2');
        expect(mockExecute.mock.calls[0][1]).toContain('/content/prompts/media/cat.webp');
    });

    it('updates missing media fields for existing prompts without duplicating rows', async () => {
        mockQueryOne.mockResolvedValue({
            Id: 42,
            CoverImageUrl: null,
            VideoPreviewUrl: null,
            CardPreviewVideoUrl: null,
            ImagesJson: null,
        });
        mockDownloadMedia.mockResolvedValue('/content/prompts/media/cat.webp');
        mockExecute.mockResolvedValue({ affectedRows: 1 });

        const { syncPromptSourceRecords } = await import('@/lib/pipelines/prompt-sources/remote-sync');
        const report = await syncPromptSourceRecords(
            {
                id: 'test-source',
                type: 'github-readme',
                defaultCategory: 'gpt-image-2',
                enabled: true,
            },
            [
                {
                    externalId: 'test-source:no-1',
                    title: 'Cat Portrait',
                    content: 'Draw a cat',
                    category: 'gpt-image-2',
                    sourceUrl: 'https://example.com/cat',
                    mediaUrls: ['https://example.com/cat.jpg'],
                },
            ]
        );

        expect(report.updated).toBe(1);
        expect(report.newlyAdded).toBe(0);
        expect(mockExecute.mock.calls[0][0]).toContain('UPDATE Prompts SET');
        expect(mockExecute.mock.calls[0][1]).toContain(42);
    });
});
