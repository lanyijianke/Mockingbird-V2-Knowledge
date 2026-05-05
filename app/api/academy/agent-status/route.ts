import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const AGENTS = [
    { id: 'sentinel', name: '哨兵', icon: '📡', status: 'active' as const, statusLabel: '爬取中', processed: 47, pending: 12, borderColor: '#00d4ff' },
    { id: 'goldvein', name: '金脉', icon: '💹', status: 'active' as const, statusLabel: '分析中', processed: 31, pending: 5, borderColor: '#ff9500' },
    { id: 'weaver', name: '织言', icon: '✍️', status: 'idle' as const, statusLabel: '空闲', processed: 18, pending: 0, borderColor: '#a855f7' },
    { id: 'probe', name: '探针', icon: '🔍', status: 'active' as const, statusLabel: '追踪中', processed: 9, pending: 3, borderColor: '#00ff88' },
];

export async function GET() {
    const agents = AGENTS.map(a => ({
        id: a.id,
        name: a.name,
        icon: a.icon,
        status: a.status,
        statusLabel: a.statusLabel,
        processed: a.processed,
        pending: a.pending,
        borderColor: a.borderColor,
    }));

    const total = agents.reduce((s, a) => s + a.processed + a.pending, 0);
    const processed = agents.reduce((s, a) => s + a.processed, 0);
    const pending = agents.reduce((s, a) => s + a.pending, 0);

    return NextResponse.json({
        success: true,
        data: {
            agents,
            summary: { total, processed, pending, queued: 3 },
        },
    });
}
