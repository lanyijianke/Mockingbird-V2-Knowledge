import { NextResponse } from 'next/server';
import { query } from '@/lib/db-console';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const items = await query<{
            Id: number; Title: string; Source: string; ContentType: string;
            Content: string; CrawlTime: string; IngestedAt: string;
            AiSummary: string; QualityScore: number;
        }>(
            `SELECT i.Id, i.Title, i.Source, i.ContentType, i.Content,
                    i.CrawlTime, i.IngestedAt,
                    t.AiSummary, t.QualityScore
             FROM IntelligenceItems i
             LEFT JOIN IntelligenceTaggings t ON t.ItemId = i.Id
             WHERE i.LifecycleStatus = 0
               AND i.ContentType IN ('Article', 'Feed', 'Discovery')
             ORDER BY i.IngestedAt DESC
             LIMIT 50`
        );

        const data = items.map(item => ({
            id: item.Id,
            title: item.Title || '',
            source: item.Source || '',
            summary: item.AiSummary || (item.Content || '').slice(0, 150),
            qualityScore: item.QualityScore ? Number(item.QualityScore) : null,
            crawlTime: item.CrawlTime,
            ingestedAt: item.IngestedAt,
            contentType: item.ContentType,
        }));

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('[API /academy/quicknews] Error:', err);
        return NextResponse.json({ success: false, error: '获取信息流失败' }, { status: 500 });
    }
}
