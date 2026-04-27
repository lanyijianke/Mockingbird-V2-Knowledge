import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('prompt media route', () => {
    const originalMediaDir = process.env.CONTENT_PROMPTS_MEDIA_DIR;
    let tempDir: string;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prompt-media-route-'));
        process.env.CONTENT_PROMPTS_MEDIA_DIR = tempDir;
    });

    afterEach(async () => {
        if (originalMediaDir === undefined) {
            delete process.env.CONTENT_PROMPTS_MEDIA_DIR;
        } else {
            process.env.CONTENT_PROMPTS_MEDIA_DIR = originalMediaDir;
        }
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('serves media files created after the Next.js process starts', async () => {
        const fileName = 'synced-after-start.webp';
        await fs.writeFile(path.join(tempDir, fileName), Buffer.from('RIFFfakeWEBP'));

        const route = await import('@/app/content/prompts/media/[fileName]/route');
        const response = await route.GET(new Request(`http://localhost:5046/content/prompts/media/${fileName}`) as never, {
            params: Promise.resolve({ fileName }),
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('image/webp');
        expect(response.headers.get('cache-control')).toContain('public');
        await expect(response.text()).resolves.toBe('RIFFfakeWEBP');
    });

    it('does not allow path traversal outside the prompt media directory', async () => {
        const route = await import('@/app/content/prompts/media/[fileName]/route');
        const response = await route.GET(new Request('http://localhost:5046/content/prompts/media/..%2Fsecret.txt') as never, {
            params: Promise.resolve({ fileName: '../secret.txt' }),
        });

        expect(response.status).toBe(404);
    });
});
