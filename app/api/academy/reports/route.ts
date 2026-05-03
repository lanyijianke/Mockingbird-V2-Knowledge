import { NextResponse } from 'next/server';
import { query } from '@/lib/db-console';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const reports = await query<{
            Id: number; Title: string; Category: string;
            ExecutiveSummary: string; SourceArticleCount: number;
            NarrativeCount: number; CreatedAt: string;
        }>(
            `SELECT Id, Title, Category, ExecutiveSummary, SourceArticleCount, NarrativeCount, CreatedAt
             FROM IntelligenceMarketReports
             WHERE LifecycleStatus = 0
             ORDER BY CreatedAt DESC
             LIMIT 20`
        );

        const data = reports.map(r => ({
            id: r.Id,
            title: r.Title,
            category: (r.Category || 'ai').toLowerCase(),
            summary: r.ExecutiveSummary || '',
            articleCount: r.SourceArticleCount ?? 0,
            narrativeCount: r.NarrativeCount ?? 0,
            createdAt: r.CreatedAt,
        }));

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('[API /academy/reports] Error:', err);
        return NextResponse.json({ success: false, error: '获取研报列表失败' }, { status: 500 });
    }
}
