import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const AGENTS = [
    { id: 'sentinel', name: '哨兵', icon: 'bi-broadcast', status: 'active' as const, statusLabel: '爬取中', processed: 47, pending: 12 },
    { id: 'goldvein', name: '金脉', icon: 'bi-graph-up-arrow', status: 'active' as const, statusLabel: '分析中', processed: 31, pending: 5 },
    { id: 'weaver', name: '织言', icon: 'bi-vector-pen', status: 'idle' as const, statusLabel: '空闲', processed: 18, pending: 0 },
    { id: 'probe', name: '探针', icon: 'bi-crosshair', status: 'active' as const, statusLabel: '追踪中', processed: 9, pending: 3 },
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
