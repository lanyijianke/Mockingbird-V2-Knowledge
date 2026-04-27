import { EventEmitter } from 'events';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSpawn = vi.fn();
const mockLoggerWarn = vi.fn();

vi.mock('child_process', () => ({
    spawn: mockSpawn,
}));

vi.mock('@/lib/utils/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: mockLoggerWarn,
        error: vi.fn(),
        persist: vi.fn(),
    },
}));

function createMissingBinaryProcess(): EventEmitter & { stderr: EventEmitter; kill: ReturnType<typeof vi.fn> } {
    const proc = new EventEmitter() as EventEmitter & { stderr: EventEmitter; kill: ReturnType<typeof vi.fn> };
    proc.stderr = new EventEmitter();
    proc.kill = vi.fn();

    queueMicrotask(() => {
        proc.emit('error', new Error('spawn yt-dlp ENOENT'));
    });

    return proc;
}

describe('media processor', () => {
    let tempDir: string;

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'media-processor-'));
        mockSpawn.mockImplementation(() => createMissingBinaryProcess());
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('stops retrying yt-dlp after detecting the binary is missing', async () => {
        const { downloadVideoWithAudio } = await import('@/lib/utils/media-processor');

        const first = await downloadVideoWithAudio('https://x.com/demo/status/1', tempDir);
        const second = await downloadVideoWithAudio('https://x.com/demo/status/2', tempDir);

        expect(first).toBeNull();
        expect(second).toBeNull();
        expect(mockSpawn).toHaveBeenCalledTimes(1);
        expect(mockLoggerWarn).toHaveBeenCalledTimes(1);
        expect(mockLoggerWarn).toHaveBeenCalledWith(
            'MediaProcessor',
            expect.stringContaining('yt-dlp 未安装')
        );
    });
});
