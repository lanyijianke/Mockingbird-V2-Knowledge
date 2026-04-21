import { NextRequest, NextResponse } from 'next/server';
import { buildSitemapChunkEntries, renderSitemapUrlSetXml } from '@/lib/services/sitemap-service';

export const runtime = 'nodejs';

export async function GET(
    _request: NextRequest,
    context: { params: Promise<Record<string, string | string[] | undefined>> },
): Promise<Response> {
    const params = await context.params;
    const chunkValue = params.chunk;
    const chunk = Array.isArray(chunkValue) ? chunkValue[0] : chunkValue;
    if (!chunk) {
        return NextResponse.json({ error: 'Sitemap chunk not found' }, { status: 404 });
    }

    const entries = await buildSitemapChunkEntries(chunk);

    if (!entries) {
        return NextResponse.json({ error: 'Sitemap chunk not found' }, { status: 404 });
    }

    const xml = renderSitemapUrlSetXml(entries);
    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
    });
}
