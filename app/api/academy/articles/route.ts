import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-console';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const category = searchParams.get('category') || '';
        const search = searchParams.get('search') || '';
        const source = searchParams.get('source') || '';
        const minScore = parseInt(searchParams.get('minScore') || '0', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '15', 10), 50);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        const conditions = ['i.LifecycleStatus = 0', "i.ContentType = 'Article'"];
        const params: (string | number)[] = [];

        if (category) {
            conditions.push('(t.Tags = ? OR t.Tags LIKE ?)');
            params.push(category, category + ',%');
        }

        if (search) {
            conditions.push('(i.Title LIKE ? OR i.Content LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }

        if (source) {
            conditions.push('i.Source = ?');
            params.push(source);
        }

        if (minScore > 0) {
            conditions.push('t.QualityScore >= ?');
            params.push(minScore);
        }

        const where = conditions.join(' AND ');

        const items = await query<{
            Id: number; Title: string; Source: string; Content: string;
            Url: string; Author: string; CrawlTime: string; IngestedAt: string;
            Images: string;
            AiSummary: string; AiReasoning: string; QualityScore: number; Tags: string;
        }>(
            `SELECT i.Id, i.Title, i.Source, i.Content, i.Url, i.Author,
                    i.CrawlTime, i.IngestedAt, i.Images,
                    t.AiSummary, t.AiReasoning, t.QualityScore, t.Tags
             FROM IntelligenceItems i
             LEFT JOIN IntelligenceTaggings t ON t.ItemId = i.Id
             WHERE ${where}
             ORDER BY i.IngestedAt DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        // Get total count for pagination
        const countRows = await query<{ cnt: number }>(
            `SELECT COUNT(*) as cnt
             FROM IntelligenceItems i
             LEFT JOIN IntelligenceTaggings t ON t.ItemId = i.Id
             WHERE ${where}`,
            params
        );

        const data = items.map(item => {
            let images: string[] = [];
            try {
                const parsed = typeof item.Images === 'string' ? JSON.parse(item.Images) : item.Images;
                if (Array.isArray(parsed)) images = parsed.filter((u: string) => typeof u === 'string');
            } catch { /* ignore */ }

            // Strip HTML tags from content preview
            let preview = item.Content || '';
            preview = preview.replace(/<img[^>]*\/?>/gi, '');
            preview = preview.replace(/<(?!\/?(?:span|a|b|i|em|strong)\b)[^>]+>/gi, '');
            if (preview.length > 400) preview = preview.slice(0, 400) + '...';

            return {
                id: item.Id,
                title: item.Title || '',
                source: item.Source || '',
                author: item.Author || '',
                preview,
                qualityScore: item.QualityScore ? Number(item.QualityScore) : null,
                crawlTime: item.CrawlTime,
                ingestedAt: item.IngestedAt,
                aiReasoning: item.AiReasoning || '',
                tags: item.Tags ? item.Tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
                url: item.Url || '',
                images: images.slice(0, 3),
            };
        });

        return NextResponse.json({
            success: true,
            data,
            total: countRows[0]?.cnt ?? 0,
        });
    } catch (err) {
        console.error('[API /academy/articles] Error:', err);
        return NextResponse.json({ success: false, error: '获取精读文章失败' }, { status: 500 });
    }
}
