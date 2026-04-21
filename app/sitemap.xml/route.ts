import { buildSitemapIndexUrls, renderSitemapIndexXml } from '@/lib/services/sitemap-service';

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
    const urls = await buildSitemapIndexUrls();
    const xml = renderSitemapIndexXml(urls);

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
    });
}
