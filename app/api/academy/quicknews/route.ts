import { NextResponse } from 'next/server';
import { query } from '@/lib/db-console';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const items = await query<{
            Id: number; Title: string; Source: string; ContentType: string;
            Content: string; CrawlTime: string; IngestedAt: string;
            Url: string; Images: string;
            AiSummary: string; AiReasoning: string; QualityScore: number;
            Domain: string; CategoryPath: string; KeywordsJson: string;
        }>(
            `SELECT i.Id, i.Title, i.Source, i.ContentType, i.Content,
                    i.CrawlTime, i.IngestedAt, i.Url, i.Images,
                    t.AiSummary, t.AiReasoning, t.QualityScore,
                    COALESCE(t.Domain, '') as Domain,
                    COALESCE(t.CategoryPath, '') as CategoryPath,
                    COALESCE(t.KeywordsJson, '[]') as KeywordsJson
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

            let keywords: string[] = [];
            try {
                keywords = JSON.parse(item.KeywordsJson || '[]');
            } catch { /* ignore */ }

            const pathParts = item.CategoryPath.split('/').filter(Boolean);
            const tags = [...new Set([...pathParts, ...keywords])];

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
                domain: item.Domain.toLowerCase(),
                categoryPath: item.CategoryPath,
                keywords,
                tags,
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
