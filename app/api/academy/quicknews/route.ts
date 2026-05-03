import { NextResponse } from 'next/server';
import { query } from '@/lib/db-console';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const items = await query<{
            Id: number; Title: string; Source: string; ContentType: string;
            Content: string; CrawlTime: string; IngestedAt: string;
            Url: string; Images: string;
            AiSummary: string; AiReasoning: string; QualityScore: number; Tags: string;
        }>(
            `SELECT i.Id, i.Title, i.Source, i.ContentType, i.Content,
                    i.CrawlTime, i.IngestedAt, i.Url, i.Images,
                    t.AiSummary, t.AiReasoning, t.QualityScore, t.Tags
             FROM IntelligenceItems i
             LEFT JOIN IntelligenceTaggings t ON t.ItemId = i.Id
             WHERE i.LifecycleStatus = 0
               AND i.ContentType IN ('Article', 'Feed', 'Discovery')
             ORDER BY i.IngestedAt DESC
             LIMIT 50`
        );

        const data = items.map(item => {
            let images: string[] = [];
            try {
                const parsed = typeof item.Images === 'string' ? JSON.parse(item.Images) : item.Images;
                if (Array.isArray(parsed)) images = parsed.filter((u: string) => typeof u === 'string');
            } catch { /* ignore */ }

            return {
                id: item.Id,
                title: item.Title || '',
                source: item.Source || '',
                summary: item.AiSummary || (item.Content || '').slice(0, 150),
                qualityScore: item.QualityScore ? Number(item.QualityScore) : null,
                crawlTime: item.CrawlTime,
                ingestedAt: item.IngestedAt,
                contentType: item.ContentType,
                aiReasoning: item.AiReasoning || '',
                tags: item.Tags ? item.Tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
                url: item.Url || '',
                images,
            };
        });

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error('[API /academy/quicknews] Error:', err);
        return NextResponse.json({ success: false, error: '获取信息流失败' }, { status: 500 });
    }
}
