import { NextRequest, NextResponse } from 'next/server';
import {
    startScheduler, stopScheduler,
    getSchedulerStatus,
} from '@/lib/jobs/scheduler';
import { syncAllAsync as promptGitHubSync } from '@/lib/pipelines/prompt-readme-sync';
import { verifyAdminHeaders } from '@/lib/utils/admin-auth';

export const runtime = 'nodejs';

/**
 * GET /api/jobs — 获取调度器状态
 * POST /api/jobs?action=start — 启动调度器
 * POST /api/jobs?action=stop — 停止调度器
 * POST /api/jobs?action=trigger-prompt-sync — 立即执行一次 PromptReadmeSync
 */
export async function GET() {
    return NextResponse.json(getSchedulerStatus());
}

export async function POST(request: NextRequest) {
    const authResult = verifyAdminHeaders(request.headers);
    if (!authResult.ok) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
        case 'start':
            startScheduler();
            return NextResponse.json({ message: '调度器已启动', ...getSchedulerStatus() });

        case 'stop':
            stopScheduler();
            return NextResponse.json({ message: '调度器已停止', ...getSchedulerStatus() });

        case 'trigger-prompt-sync': {
            console.log('[API] 手动触发 PromptReadmeSync...');
            const report = await promptGitHubSync();
            console.log('[API] PromptReadmeSync 完成:', report);
            return NextResponse.json({ message: 'PromptReadmeSync 已执行', report });
        }

        default:
            return NextResponse.json({ error: '无效的 action（可选: start, stop, trigger-prompt-sync）' }, { status: 400 });
    }
}
