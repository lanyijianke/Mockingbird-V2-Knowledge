import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockStartScheduler = vi.fn();
const mockStopScheduler = vi.fn();
const mockGetSchedulerStatus = vi.fn(() => ({ running: false, jobs: [] }));
const mockPromptSync = vi.fn(async () => ({ totalParsed: 0, newlyAdded: 0, updated: 0, skipped: 0 }));

vi.mock('@/lib/jobs/scheduler', () => ({
    startScheduler: mockStartScheduler,
    stopScheduler: mockStopScheduler,
    getSchedulerStatus: mockGetSchedulerStatus,
}));

vi.mock('@/lib/pipelines/prompt-readme-sync', () => ({
    syncAllAsync: mockPromptSync,
}));

const ORIGINAL_ADMIN_TOKEN = process.env.KNOWLEDGE_ADMIN_TOKEN;

describe('POST /api/jobs auth guard', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        process.env.KNOWLEDGE_ADMIN_TOKEN = 'unit-test-token';
        mockGetSchedulerStatus.mockReturnValue({ running: false, jobs: [] });
        mockPromptSync.mockResolvedValue({ totalParsed: 0, newlyAdded: 0, updated: 0, skipped: 0 });
    });

    afterEach(() => {
        if (ORIGINAL_ADMIN_TOKEN === undefined) {
            delete process.env.KNOWLEDGE_ADMIN_TOKEN;
        } else {
            process.env.KNOWLEDGE_ADMIN_TOKEN = ORIGINAL_ADMIN_TOKEN;
        }
    });

    it('returns 401 when admin token is missing', async () => {
        const { POST } = await import('@/app/api/jobs/route');
        const request = new Request('http://localhost:5046/api/jobs?action=start', {
            method: 'POST',
        });

        const response = await POST(request as never);
        expect(response.status).toBe(401);
        expect(mockStartScheduler).not.toHaveBeenCalled();
    });

    it('returns 403 when admin token is invalid', async () => {
        const { POST } = await import('@/app/api/jobs/route');
        const request = new Request('http://localhost:5046/api/jobs?action=start', {
            method: 'POST',
            headers: {
                'x-admin-token': 'wrong-token',
            },
        });

        const response = await POST(request as never);
        expect(response.status).toBe(403);
        expect(mockStartScheduler).not.toHaveBeenCalled();
    });

    it('allows start action when admin token is valid', async () => {
        mockGetSchedulerStatus.mockReturnValue({ running: true, jobs: [] });
        const { POST } = await import('@/app/api/jobs/route');
        const request = new Request('http://localhost:5046/api/jobs?action=start', {
            method: 'POST',
            headers: {
                'x-admin-token': 'unit-test-token',
            },
        });

        const response = await POST(request as never);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.message).toContain('调度器已启动');
        expect(mockStartScheduler).toHaveBeenCalledTimes(1);
    });

    it('runs source sync only when trigger-prompt-sync is called', async () => {
        mockPromptSync.mockResolvedValue({ totalParsed: 3, newlyAdded: 2, updated: 0, skipped: 1 });

        const { POST } = await import('@/app/api/jobs/route');
        const request = new Request('http://localhost:5046/api/jobs?action=trigger-prompt-sync', {
            method: 'POST',
            headers: {
                'x-admin-token': 'unit-test-token',
            },
        });

        const response = await POST(request as never);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(mockPromptSync).toHaveBeenCalledTimes(1);
        expect(body).toEqual({
            message: '提示词同步已执行',
            report: {
                sources: { totalParsed: 3, newlyAdded: 2, updated: 0, skipped: 1 },
            },
        });
    });
});
