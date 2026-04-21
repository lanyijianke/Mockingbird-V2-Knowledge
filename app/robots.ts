import type { MetadataRoute } from 'next';

// ════════════════════════════════════════════════════════════════
// robots.txt — 搜索引擎爬虫控制
// https://developers.google.com/search/docs/crawling-indexing/robots/intro
// ════════════════════════════════════════════════════════════════

const BASE_URL = process.env.SITE_URL || 'https://aigcclub.com.cn';
const BLOCK_BAIDU = (process.env.ROBOTS_BLOCK_BAIDU || 'false').toLowerCase() === 'true';

export default function robots(): MetadataRoute.Robots {
    const rules: MetadataRoute.Robots['rules'] = [
        {
            // 默认爬虫策略：允许全站，禁爬 API
            userAgent: '*',
            allow: '/',
            disallow: ['/api/'],
        },
    ];

    if (BLOCK_BAIDU) {
        rules.push({
            // 按环境变量开关决定是否屏蔽 Baidu
            userAgent: 'Baiduspider',
            disallow: '/',
        });
    } else {
        rules.push({
            userAgent: 'Baiduspider',
            allow: '/',
            disallow: ['/api/'],
        });
    }

    return {
        rules,
        sitemap: `${BASE_URL}/sitemap.xml`,
    };
}
