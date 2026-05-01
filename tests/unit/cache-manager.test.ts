import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CacheManager } from '@/lib/cache/manager';
import { MemoryCacheStore } from '@/lib/cache/memory-store';
import type { CachePolicy } from '@/lib/cache/types';

const basicPolicy: CachePolicy = {
    id: 'test.basic',
    namespace: 'test.basic',
    ttlMs: 1000,
    maxEntries: 10,
};

const stalePolicy: CachePolicy = {
    id: 'test.stale',
    namespace: 'test.stale',
    ttlMs: 1000,
    maxEntries: 10,
    allowStaleOnError: true,
};

const preserveEmptyPolicy: CachePolicy = {
    id: 'test.preserve-empty',
    namespace: 'test.preserve-empty',
    ttlMs: 1000,
    maxEntries: 10,
    replaceOnEmptyResult: false,
};

describe('CacheManager', () => {
    let manager: CacheManager;

    beforeEach(() => {
        vi.useFakeTimers();
        manager = new CacheManager(new MemoryCacheStore());
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('reuses fresh cached values without calling the loader again', async () => {
        const loader = vi.fn(async () => 'cached-value');

        await expect(
            manager.getOrLoad(basicPolicy, ['alpha'], loader, { tags: ['shared'] })
        ).resolves.toBe('cached-value');
        await expect(
            manager.getOrLoad(basicPolicy, ['alpha'], loader, { tags: ['shared'] })
        ).resolves.toBe('cached-value');

        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('invalidates a single key and reloads it on the next request', async () => {
        const loader = vi.fn()
            .mockResolvedValueOnce('v1')
            .mockResolvedValueOnce('v2');

        await expect(
            manager.getOrLoad(basicPolicy, ['alpha'], loader)
        ).resolves.toBe('v1');

        manager.invalidate(basicPolicy, ['alpha']);

        await expect(
            manager.getOrLoad(basicPolicy, ['alpha'], loader)
        ).resolves.toBe('v2');

        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('invalidates all keys registered under the same tag', async () => {
        const loaderA = vi.fn()
            .mockResolvedValueOnce('a1')
            .mockResolvedValueOnce('a2');
        const loaderB = vi.fn()
            .mockResolvedValueOnce('b1')
            .mockResolvedValueOnce('b2');

        await manager.getOrLoad(basicPolicy, ['alpha'], loaderA, { tags: ['group'] });
        await manager.getOrLoad(basicPolicy, ['beta'], loaderB, { tags: ['group'] });

        manager.invalidateTag('group');

        await expect(
            manager.getOrLoad(basicPolicy, ['alpha'], loaderA, { tags: ['group'] })
        ).resolves.toBe('a2');
        await expect(
            manager.getOrLoad(basicPolicy, ['beta'], loaderB, { tags: ['group'] })
        ).resolves.toBe('b2');

        expect(loaderA).toHaveBeenCalledTimes(2);
        expect(loaderB).toHaveBeenCalledTimes(2);
    });

    it('returns the last good value when refresh fails and stale fallback is enabled', async () => {
        const loader = vi.fn()
            .mockResolvedValueOnce(['first'])
            .mockRejectedValueOnce(new Error('upstream failed'));

        await expect(
            manager.getOrLoad(stalePolicy, ['alpha'], loader)
        ).resolves.toEqual(['first']);

        vi.advanceTimersByTime(1001);

        await expect(
            manager.getOrLoad(stalePolicy, ['alpha'], loader)
        ).resolves.toEqual(['first']);

        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('keeps the previous value when the refresh result is empty and replacement is disabled', async () => {
        const loader = vi.fn()
            .mockResolvedValueOnce(['kept'])
            .mockResolvedValueOnce([]);

        await expect(
            manager.getOrLoad(preserveEmptyPolicy, ['alpha'], loader)
        ).resolves.toEqual(['kept']);

        vi.advanceTimersByTime(1001);

        await expect(
            manager.getOrLoad(preserveEmptyPolicy, ['alpha'], loader)
        ).resolves.toEqual(['kept']);

        expect(loader).toHaveBeenCalledTimes(2);
    });
});
