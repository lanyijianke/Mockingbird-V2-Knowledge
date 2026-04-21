import { query, queryOne, queryScalar, execute } from '@/lib/db';
import { ArticleListItem, ArticleDetail, ArticleStatus, ArticleRow, PagedResult } from '@/lib/types';
import { getCategoryName } from '@/lib/categories';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

// ════════════════════════════════════════════════════════════════
// 文章服务 — 对应 ArticleService.cs + ArticleRepository.cs
// 分类已从 DB Categories 表迁移至静态配置文件
// ════════════════════════════════════════════════════════════════

// ── 内存缓存 (统一 MemoryCache) ───────────────────────────────
import { MemoryCache } from '@/lib/utils/memory-cache';

const cache = new MemoryCache(10 * 60 * 1000); // 10 分钟 TTL
let cacheVersion = 0;

function clearArticleCache(slug?: string) {
    cache.delete('articles_all');
    if (slug) cache.delete(`article_${slug}`);
    cacheVersion++;
}

// ── 文章内容目录 ─────────────────────────────────────────────
const ARTICLES_DIR = process.env.CONTENT_ARTICLES_DIR || './public/content/articles';

// ── 行数据 → DTO 映射 ───────────────────────────────────────
function rowToListItem(row: ArticleRow): ArticleListItem {
    return {
        id: row.Id,
        title: row.Title,
        slug: row.Slug,
        summary: row.Summary || '',
        category: row.Category || 'industry-news',
        status: row.Status as ArticleStatus,
        coverUrl: row.CoverUrl || null,
        createdAt: row.CreatedAt ? new Date(row.CreatedAt).toISOString() : '',
        viewCount: row.ViewCount || 0,
    };
}

interface ArticleSitemapRow {
    Slug: string;
    LastModified: string | null;
}

// ════════════════════════════════════════════════════════════════
// 公开 API
// ════════════════════════════════════════════════════════════════

/** 获取 Top N 文章 (对应 GetTopArticlesAsync) */
export async function getTopArticles(count: number = 9): Promise<ArticleListItem[]> {
    const cacheKey = `articles_top_${count}_v${cacheVersion}`;
    const cached = cache.get(cacheKey) as ArticleListItem[] | null;
    if (cached) return cached;

    const rows = await query<ArticleRow>(
        'SELECT * FROM Articles ORDER BY CreatedAt DESC LIMIT ?',
        [count]
    );
    const result = rows.map(r => rowToListItem(r));
    cache.set(cacheKey, result);
    return result;
}

/** 分页查询文章 (对应 GetPagedArticlesAsync) */
export async function getPagedArticles(
    page: number = 1,
    pageSize: number = 12,
    category?: string,
    searchQuery?: string
): Promise<PagedResult<ArticleListItem>> {
    const offset = (page - 1) * pageSize;
    const conditions: string[] = ['1=1'];
    const params: (string | number)[] = [];

    if (category) {
        conditions.push('Category = ?');
        params.push(category);
    }

    if (searchQuery) {
        conditions.push('(Title LIKE ? OR Summary LIKE ?)');
        const pattern = `%${searchQuery}%`;
        params.push(pattern, pattern);
    }

    const whereClause = conditions.join(' AND ');

    // 查询总数
    const totalCount = await queryScalar<number>(
        `SELECT COUNT(*) FROM Articles WHERE ${whereClause}`,
        params
    ) ?? 0;

    // 查询分页数据
    const rows = await query<ArticleRow>(
        `SELECT Id, Title, Slug, Summary, Category, Status, CoverUrl, CreatedAt, ViewCount 
     FROM Articles 
     WHERE ${whereClause}
     ORDER BY CreatedAt DESC
     LIMIT ?, ?`,
        [...params, offset, pageSize]
    );

    const items = rows.map(r => rowToListItem(r));

    return {
        items,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
    };
}

/** 根据 Slug 获取文章详情 (对应 GetArticleBySlugAsync) */
export async function getArticleBySlug(slug: string): Promise<ArticleDetail | null> {
    const cacheKey = `article_${slug}`;
    const cached = cache.get(cacheKey) as ArticleDetail | null;
    if (cached) return cached;

    const row = await queryOne<ArticleRow>(
        'SELECT * FROM Articles WHERE Slug = ?',
        [slug]
    );
    if (!row) return null;

    // SSG: 从文件系统读取正文 Markdown
    const content = await loadContentFromFile(slug);

    const detail: ArticleDetail = {
        id: row.Id,
        title: row.Title,
        slug: row.Slug,
        summary: row.Summary || '',
        content,
        renderedHtml: null, // Next.js 端用 react-markdown 实时渲染
        category: row.Category || 'industry-news',
        status: row.Status as ArticleStatus,
        coverUrl: row.CoverUrl || null,
        seoTitle: row.SeoTitle || null,
        seoDescription: row.SeoDescription || null,
        seoKeywords: row.SeoKeywords || null,
        createdAt: row.CreatedAt ? new Date(row.CreatedAt).toISOString() : '',
        updatedAt: row.UpdatedAt ? new Date(row.UpdatedAt).toISOString() : null,
        viewCount: row.ViewCount || 0,
    };

    cache.set(cacheKey, detail);
    return detail;
}

/** 获取所有文章 Slug (用于 SSG generateStaticParams) */
export async function getAllSlugs(): Promise<string[]> {
    const rows = await query<ArticleRow>('SELECT Slug FROM Articles ORDER BY CreatedAt DESC');
    return rows.map(r => r.Slug);
}

export interface ArticleSitemapEntry {
    slug: string;
    lastModified: string | null;
}

/** 获取 sitemap 所需的文章 URL 与真实更新时间 */
export async function getArticleSitemapEntries(): Promise<ArticleSitemapEntry[]> {
    const rows = await query<ArticleSitemapRow>(
        `SELECT Slug, COALESCE(UpdatedAt, CreatedAt) AS LastModified
         FROM Articles
         ORDER BY CreatedAt DESC`
    );
    return rows.map((row) => ({
        slug: row.Slug,
        lastModified: row.LastModified,
    }));
}

/** 阅读量追踪 (对应 TrackViewAsync) */
export async function trackView(slug: string): Promise<boolean> {
    const result = await execute(
        'UPDATE Articles SET ViewCount = ViewCount + 1 WHERE Slug = ?',
        [slug]
    );
    if (result.affectedRows > 0) {
        clearArticleCache(slug);
        return true;
    }
    return false;
}

/** 获取同分类推荐文章（排除指定 slug） */
export async function getRelatedArticles(
    category: string,
    excludeSlug: string,
    limit: number = 6
): Promise<ArticleListItem[]> {
    const cacheKey = `articles_related_${category}_${excludeSlug}_${limit}_v${cacheVersion}`;
    const cached = cache.get(cacheKey) as ArticleListItem[] | null;
    if (cached) return cached;

    const rows = await query<ArticleRow>(
        'SELECT * FROM Articles WHERE Category = ? AND Slug != ? ORDER BY CreatedAt DESC LIMIT ?',
        [category, excludeSlug, limit]
    );
    const result = rows.map(r => rowToListItem(r));
    cache.set(cacheKey, result);
    return result;
}

/** 获取文章总数 */
export async function getTotalCount(): Promise<number> {
    return (await queryScalar<number>('SELECT COUNT(*) FROM Articles')) ?? 0;
}

// ── 内部辅助 ─────────────────────────────────────────────────

/**
 * 从文件系统加载文章正文 Markdown
 * 路径规则: {articlesDir}/{slug}/{slug}.md
 * 对应 ArticleService.LoadContentFromFileAsync
 */
async function loadContentFromFile(slug: string): Promise<string> {
    const filePath = path.join(ARTICLES_DIR, slug, `${slug}.md`);
    try {
        const fullContent = await fs.readFile(filePath, 'utf-8');
        // 使用 gray-matter 剥离 YAML Frontmatter
        const { content } = matter(fullContent);
        return content.trim();
    } catch {
        console.warn(`[ArticleService] Content file not found: ${filePath}`);
        return '';
    }
}

// 导出 getCategoryName 以便页面使用
export { getCategoryName };
