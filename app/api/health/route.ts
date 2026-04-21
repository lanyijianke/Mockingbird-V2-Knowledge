import { NextResponse } from 'next/server';
import { queryScalar } from '@/lib/db';
import { getSchedulerStatus } from '@/lib/jobs/scheduler';

export const runtime = 'nodejs';

// GET /api/health — 增强版健康检查
export async function GET() {
    let dbStatus = 'ok';
    let articleCount = 0;
    let promptCount = 0;

    try {
        articleCount = (await queryScalar<number>('SELECT COUNT(*) FROM Articles')) ?? 0;
        promptCount = (await queryScalar<number>('SELECT COUNT(*) FROM Prompts')) ?? 0;
    } catch {
        dbStatus = 'error';
    }

    const scheduler = getSchedulerStatus();

    return NextResponse.json({
        status: dbStatus === 'ok' ? 'healthy' : 'degraded',
        service: 'Mockingbird Knowledge Web',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.1.0',
        database: {
            status: dbStatus,
            articles: articleCount,
            prompts: promptCount,
        },
        scheduler: {
            running: scheduler.running,
            jobs: scheduler.jobs,
        },
    });
}
