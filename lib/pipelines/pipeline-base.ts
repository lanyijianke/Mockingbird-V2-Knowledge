import path from 'path';
import fs from 'fs/promises';
import { chatAsync, smartTruncate, cleanJsonResponse } from '@/lib/ai/chat-client';
import { logger } from '@/lib/utils/logger';

// ════════════════════════════════════════════════════════════════
// 管道基类 — 对应 KnowledgePipelineBase.cs
// 提供路径解析、AI 元数据提取、Slug 生成等共用能力
// ════════════════════════════════════════════════════════════════

/**
 * 解析路径：相对路径基于 cwd 解析
 */
export function resolvePath(configPath: string | undefined, defaultPath: string): string {
    const raw = configPath || defaultPath;
    if (path.isAbsolute(raw)) return raw;
    return path.resolve(process.cwd(), raw);
}

/**
 * 确保目录存在
 */
export async function ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Slugify 标题 — 对应 KnowledgePipelineBase.Slugify
 */
export function slugify(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

/**
 * 提取文章封面 URL — 取 Markdown 中第一张图片
 * 对应 ArticlePipeline.ExtractCoverUrl
 */
export function extractCoverUrl(content: string): string | null {
    const match = content.match(/!\[.*?\]\((.*?)\)/);
    return match ? match[1] : null;
}

/**
 * 删除文件（带错误容忍）
 */
export async function safeDelete(filePath: string): Promise<void> {
    try {
        await fs.unlink(filePath);
    } catch {
        // 文件可能已不存在
    }
}

/**
 * 列出目录中的所有 .md 文件
 */
export async function listMarkdownFiles(dirPath: string): Promise<string[]> {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true, recursive: true });
        return entries
            .filter(e => e.isFile() && e.name.endsWith('.md'))
            .map(e => path.join(e.parentPath || dirPath, e.name));
    } catch {
        return [];
    }
}

/**
 * 列出目录中的所有 .csv 文件
 */
export async function listCsvFiles(dirPath: string): Promise<string[]> {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        return entries
            .filter(e => e.isFile() && e.name.endsWith('.csv'))
            .map(e => path.join(dirPath, e.name));
    } catch {
        return [];
    }
}

export interface ArticleMetadata {
    title: string;
    summary: string;
    slug: string;
    category: string;
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string;
}

/**
 * 调用 AI 提取文章元数据
 * 提示词迁移自 Console article-curator Agent（含 Few-Shot 正负样本）
 */
export async function extractArticleMetadataAsync(content: string): Promise<ArticleMetadata | null> {
    const truncated = smartTruncate(content, 12000);

    const systemPrompt = `你是一名专业的内容编辑与 SEO 专家。你的任务是从原始文章中提取结构化的元数据信息。

提取要求：
1. 标题(title)：提炼文章核心主题，翻译为精炼中文，不超过 30 字。
2. 分类(category)：必须是以下 8 个分类编码之一：vibe-coding, prompts, agents, industry-news, tech-practice, tech-basics, solutions, investment-research。
3. 摘要(summary)：80 字以内的中文摘要，精准涵盖文章核心价值。
4. Slug：英文短横线格式，唯一标识，不包含中文。
5. SEO 标题(seoTitle)：中文，适合搜索引擎展示。
6. SEO 描述(seoDescription)：中文，适合搜索引擎摘要展示。
7. SEO 关键词(seoKeywords)：中文关键词，逗号分隔。

输出格式：标准 JSON 对象，不要包含 Markdown 代码块标记。

【样本学习区 (Few-Shot & Negative Examples)】

🟢 正向示例：
[输入]："这篇长文深入探讨了 Vibe Coding 的底层逻辑，结合 Cursor 演示了如何用自然语言直接生成全栈应用..."
[正确 JSON]：
{
  "title": "Vibe Coding 深度解析：用自然语言生成全栈应用",
  "category": "vibe-coding",
  "summary": "本文深度解析 Vibe Coding 底层逻辑，并结合 Cursor 演示自然语言开发全栈应用的实战技巧。",
  "slug": "vibe-coding-deep-dive-cursor",
  "seoTitle": "Vibe Coding 深度解析 | Cursor 全栈开发实战",
  "seoDescription": "探索 Vibe Coding 底层逻辑，学习如何使用 Cursor 和自然语言直接生成全栈应用的实战指南。",
  "seoKeywords": "Vibe Coding,Cursor,自然语言编程,全栈开发,AI编程"
}

🔴 错误反例：
{
  "title": "探索人工智能编程的未来潜力",      // ❌ 太虚泛
  "category": "AI探索",                 // ❌ 必须从指定的 8 个编码选择
  "summary": "这篇文章不可否认地向我们展示了技术的飞速发展。", // ❌ AI 废话
  "slug": "探索-人工智能-编程",           // ❌ 包含中文
  "seoTitle": "探索人工智能编程的未来潜力",
  "seoDescription": "这篇文章不可否认地向我们展示了技术的飞速发展。",
  "seoKeywords": "AI,编程"
}
❌ 错误解析：分类错、Slug有中文、摘要充满 AI 废话模板。严禁此类低质量提取！`;

    try {
        const raw = await chatAsync(systemPrompt, truncated);
        const cleaned = cleanJsonResponse(raw);
        return JSON.parse(cleaned) as ArticleMetadata;
    } catch (err) {
        logger.error('PipelineBase', 'AI 元数据提取失败', err);
        return null;
    }
}



export interface PipelineReport {
    totalParsed: number;
    newlyAdded: number;
    updated: number;
    skipped: number;
}

export function createEmptyReport(): PipelineReport {
    return { totalParsed: 0, newlyAdded: 0, updated: 0, skipped: 0 };
}
