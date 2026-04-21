import { notFound } from 'next/navigation';
import { getArticleBySlug, getAllSlugs, getRelatedArticles } from '@/lib/services/article-service';
import { getCategoryName } from '@/lib/categories';
import type { Metadata } from 'next';
import { buildArticleJsonLd, buildBreadcrumbJsonLd, JsonLdScript } from '@/lib/utils/json-ld';
import ArticleReaderClient from './ArticleReaderClient';
import './article-reader.css';

const SITE_URL = process.env.SITE_URL || 'https://aigcclub.com.cn';

export const runtime = 'nodejs';
export const revalidate = 3600; // ISR: 1小时

// SSG: 预生成已有文章页
export async function generateStaticParams() {
    const slugs = await getAllSlugs();
    return slugs.map((slug) => ({ slug }));
}

// 动态元标签
export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const article = await getArticleBySlug(slug);
    if (!article) return { title: '文章未找到' };

    return {
        title: article.seoTitle || article.title,
        description: article.seoDescription || article.summary,
        keywords: article.seoKeywords || undefined,
        alternates: { canonical: `/articles/${slug}` },
        openGraph: {
            title: article.title,
            description: article.summary || undefined,
            type: 'article',
            url: `${SITE_URL}/articles/${slug}`,
            images: article.coverUrl ? [article.coverUrl] : undefined,
            publishedTime: article.createdAt,
            modifiedTime: article.updatedAt || undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title: article.title,
            description: article.summary || undefined,
            images: article.coverUrl ? [article.coverUrl] : undefined,
        },
    };
}

// ════════ TOC 提取 ════════
interface TocItem {
    id: string;
    text: string;
    level: number;
}

function extractToc(markdown: string): TocItem[] {
    const headingRegex = /^(#{1,5})\s+(.+)$/gm;
    const toc: TocItem[] = [];
    let match: RegExpExecArray | null;
    while ((match = headingRegex.exec(markdown)) !== null) {
        const level = match[1].length;
        const text = match[2]
            .replace(/\*\*(.+?)\*\*/g, '$1') // bold
            .replace(/\*(.+?)\*/g, '$1') // italic
            .replace(/`(.+?)`/g, '$1') // inline code
            .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
            .trim();
        // Build slug (same as rehype-slug)
        const id = text
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s-]/gu, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        if (text && id) {
            toc.push({ id, text, level });
        }
    }
    return toc;
}

// ════════ 阅读时间估算 ════════
function estimateReadingMinutes(content: string): number {
    // 去除代码块、URL、Markdown 标记，只保留可读文字
    const plain = content
        .replace(/```[\s\S]*?```/g, '') // 代码块
        .replace(/`[^`]+`/g, '') // 行内代码
        .replace(/https?:\/\/\S+/g, '') // URL
        .replace(/[#*\[\]()\>|_~`\-!]/g, '') // Markdown 符号
        .replace(/\s+/g, ''); // 空白
    return Math.max(1, Math.ceil(plain.length / 600));
}

export default async function ArticleDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const article = await getArticleBySlug(slug);
    if (!article) notFound();

    const content = article.content || '';
    const toc = extractToc(content);
    const readingMinutes = estimateReadingMinutes(content);

    // 获取同分类推荐文章
    const relatedArticles = await getRelatedArticles(article.category, slug, 6);

    const dateStr = new Date(article.createdAt).toLocaleDateString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    // 服务端渲染 Markdown → HTML (使用动态 import 避免 SSR 问题)
    const { unified } = await import('unified');
    const remarkParse = (await import('remark-parse')).default;
    const remarkGfm = (await import('remark-gfm')).default;
    const remarkRehype = (await import('remark-rehype')).default;
    const rehypeSlug = (await import('rehype-slug')).default;
    const rehypeHighlight = (await import('rehype-highlight')).default;
    const rehypeStringify = (await import('rehype-stringify')).default;

    const result = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype)
        .use(rehypeSlug)
        .use(rehypeHighlight, { detect: true, ignoreMissing: true })
        .use(rehypeStringify)
        .process(content);

    let renderedHtml = String(result);

    // 修复相对路径图片引用
    renderedHtml = renderedHtml
        .replace(/src="\.\/assets\//g, `src="/content/articles/${slug}/assets/`)
        .replace(/src="assets\//g, `src="/content/articles/${slug}/assets/`)
        .replace(/src="\.\/images\//g, `src="/content/articles/${slug}/images/`)
        .replace(/src="images\//g, `src="/content/articles/${slug}/images/`)
        .replace(/<img /g, '<img loading="lazy" ');

    const articleUrl = `https://aigcclub.com.cn/articles/${slug}`;

    return (
        <>
            {/* SEO: Article + BreadcrumbList JSON-LD */}
            <JsonLdScript data={[
                buildArticleJsonLd({
                    title: article.title,
                    summary: article.summary,
                    slug,
                    coverUrl: article.coverUrl,
                    createdAt: article.createdAt,
                    updatedAt: article.updatedAt,
                    category: article.category,
                }),
                buildBreadcrumbJsonLd([
                    { name: '首页', url: SITE_URL },
                    { name: '文章', url: `${SITE_URL}/articles` },
                    { name: article.title, url: articleUrl },
                ]),
            ]} />

            <ArticleReaderClient
                renderedHtml={renderedHtml}
                toc={toc}
                title={article.title}
                categoryName={getCategoryName(article.category)}
                dateStr={dateStr}
                readingMinutes={readingMinutes}
                summary={article.summary ?? ''}
                articleUrl={articleUrl}
                relatedArticles={relatedArticles.map(a => ({
                    slug: a.slug,
                    title: a.title,
                    coverUrl: a.coverUrl,
                    category: getCategoryName(a.category),
                    summary: a.summary,
                }))}
            />
        </>
    );
}
