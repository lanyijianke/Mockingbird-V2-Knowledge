import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('knowledge scheduler', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(async () => {
        const scheduler = await import('@/lib/jobs/scheduler');
        scheduler.stopScheduler();
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    it('registers only prompt and ranking jobs', async () => {
        const scheduler = await import('@/lib/jobs/scheduler');

        scheduler.startScheduler();

        expect(scheduler.getSchedulerStatus().jobs.map((job) => job.name)).toEqual([
            '提示词同步',
            '排行榜同步',
        ]);
    });
});
