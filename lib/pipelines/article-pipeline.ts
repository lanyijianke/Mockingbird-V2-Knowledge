import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';
import matter from 'gray-matter';
import { queryOne, execute } from '@/lib/db';
import { fetchFromConsole, postToConsole } from '@/lib/utils/console-client';
import { logger } from '@/lib/utils/logger';
import {
    resolvePath, ensureDir, slugify, extractCoverUrl,
    listMarkdownFiles, safeDelete,
    extractArticleMetadataAsync,
    type PipelineReport, createEmptyReport,
} from './pipeline-base';

// ════════════════════════════════════════════════════════════════
// 文章入库管线 — 对应 ArticleSyncJob + ArticlePipeline
// 阶段一：从 Console 拉取审核通过的文章 zip 包 → 解包到 Raw_Incoming
// 阶段二：扫描 Raw_Incoming 下文章目录 → 清洗元数据 → 写入 DB + 文件
// ════════════════════════════════════════════════════════════════

const CONSOLE_BASE = process.env.CONSOLE_API_BASE_URL || 'http://localhost:5299';

interface ApprovedListResponse {
    count: number;
    ids: string[];
}

// ─── 阶段一：从 Console 拉取 zip 包 ──────────────────────────

export async function pullFromConsole(): Promise<number> {
    const rawDir = resolvePath(
        process.env.TRANSMUTER_RAW_INCOMING_DIR,
        './raw-incoming/articles'
    );
    await ensureDir(rawDir);

    // 1. 先获取待拉取的包 ID 列表（轻量请求）
    const listData = await fetchFromConsole<ApprovedListResponse>(
        '/api/data/articles/approved/list?limit=20'
    );

    if (!listData || !listData.ids || listData.ids.length === 0) {
        logger.debug('ArticlePipeline', '无待拉取的文章');
        return 0;
    }

    logger.info('ArticlePipeline', `从 Console 发现 ${listData.ids.length} 个待拉取的文章包`);

    const successIds: string[] = [];

    // 2. 逐个下载 zip 并解包
    for (const packageId of listData.ids) {
        try {
            const zipUrl = `${CONSOLE_BASE}/api/data/articles/approved/${encodeURIComponent(packageId)}/download`;
            const res = await fetch(zipUrl);

            if (!res.ok) {
                logger.warn('ArticlePipeline', `下载失败 ${packageId}: HTTP ${res.status}`);
                continue;
            }

            const zipBuffer = Buffer.from(await res.arrayBuffer());
            const zip = new AdmZip(zipBuffer);

            // 解包到 raw-incoming/articles/{packageId}/
            const packageDir = path.join(rawDir, packageId);
            await ensureDir(packageDir);
            zip.extractAllTo(packageDir, true);

            successIds.push(packageId);
            logger.debug('ArticlePipeline', `已解包: ${packageId}`);
        } catch (err) {
            logger.error('ArticlePipeline', `下载/解包失败: ${packageId}`, err);
        }
    }

    // 3. 回调 Console 标记已导出（物理删除 Console 的 approved/ 目录）
    if (successIds.length > 0) {
        await postToConsole('/api/data/articles/mark-exported', { ids: successIds });
        logger.info('ArticlePipeline', `已标记 ${successIds.length} 个包为已导出`);
    }

    return successIds.length;
}

// ─── 阶段二：本地文件入库 ─────────────────────────────────────

export async function ingestLocalFiles(): Promise<PipelineReport> {
    const report = createEmptyReport();
    const rawDir = resolvePath(
        process.env.TRANSMUTER_RAW_INCOMING_DIR,
        './raw-incoming/articles'
    );

    // 扫描所有 .md 文件（支持子目录，如 raw-incoming/articles/{packageId}/article.md）
    const mdFiles = await listMarkdownFiles(rawDir);
    if (mdFiles.length === 0) return report;

    logger.info('ArticlePipeline', `发现 ${mdFiles.length} 个待处理文章文件`);

    const articlesDir = resolvePath(
        process.env.CONTENT_ARTICLES_DIR,
        './public/content/articles'
    );

    for (const filePath of mdFiles) {
        const fileName = path.basename(filePath);
        const fileDir = path.dirname(filePath);

        try {
            const rawContent = await fs.readFile(filePath, 'utf-8');
            const { data: frontmatter, content } = matter(rawContent);

            if (!content || content.trim().length < 100) {
                logger.warn('ArticlePipeline', `文件内容过短，跳过: ${fileName}`);
                report.skipped++;
                continue;
            }

            report.totalParsed++;

            // AI 提取元数据
            const metadata = await extractArticleMetadataAsync(content);
            const title = metadata?.title || frontmatter.title || fileName.replace('.md', '');
            const slug = metadata?.slug || frontmatter.slug || slugify(title) || `article-${Date.now()}`;
            const summary = metadata?.summary || frontmatter.summary || content.slice(0, 120);

            // 检查是否已存在
            const existing = await queryOne(
                'SELECT Id FROM Articles WHERE Slug = ?', [slug]
            );

            if (existing) {
                logger.debug('ArticlePipeline', `文章已存在，跳过: ${slug}`);
                report.skipped++;
                await safeDeleteDir(fileDir, rawDir);
                continue;
            }

            // 分类编码
            const category = metadata?.category || frontmatter.category || 'industry-news';
            const coverUrl = extractCoverUrl(content) || '/images/default-cover.png';

            // 写入文件系统
            const articleDir = path.join(articlesDir, slug);
            await ensureDir(articleDir);

            // 复制 images/ 目录（如果存在）
            const sourceImagesDir = path.join(fileDir, 'images');
            const targetImagesDir = path.join(articleDir, 'images');
            await copyImagesDir(sourceImagesDir, targetImagesDir);

            // 写入完整 Markdown（带 frontmatter）
            const articleFilePath = path.join(articleDir, `${slug}.md`);
            const fullContent = `---
title: "${escapeYaml(title)}"
slug: "${slug}"
summary: "${escapeYaml(summary)}"
category: "${escapeYaml(category)}"
coverUrl: "${coverUrl}"
---

${content}`;
            await fs.writeFile(articleFilePath, fullContent, 'utf-8');

            // 写入数据库
            const initialViewCount = Math.floor(Math.random() * 9900) + 100;
            await execute(
                `INSERT INTO Articles (Title, Slug, Summary, Category, Status, CoverUrl, SeoTitle, SeoDescription, SeoKeywords, CreatedAt, ViewCount)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, datetime('now'), ?)`,

                [
                    title, slug, summary, category, coverUrl,
                    metadata?.seoTitle || title,
                    metadata?.seoDescription || summary,
                    metadata?.seoKeywords || '',
                    initialViewCount,
                ]
            );

            report.newlyAdded++;
            logger.info('ArticlePipeline', `文章入库成功: ${slug}`);

            // 清理源文件/目录
            await safeDeleteDir(fileDir, rawDir);
        } catch (err) {
            logger.error('ArticlePipeline', `处理失败: ${fileName}`, err);
        }
    }

    return report;
}

// ─── 工具函数 ─────────────────────────────────────────────────

/**
 * 复制 images/ 目录到文章最终路径
 */
async function copyImagesDir(sourceDir: string, targetDir: string): Promise<void> {
    try {
        const entries = await fs.readdir(sourceDir, { withFileTypes: true });
        if (entries.length === 0) return;

        await ensureDir(targetDir);

        for (const entry of entries) {
            if (entry.isFile()) {
                const src = path.join(sourceDir, entry.name);
                const dst = path.join(targetDir, entry.name);
                await fs.copyFile(src, dst);
            }
        }

        logger.debug('ArticlePipeline', `复制了 ${entries.filter(e => e.isFile()).length} 张图片`);
    } catch {
        // images/ 目录不存在，跳过
    }
}

/**
 * 安全删除来源目录（仅删除 rawDir 的子目录，不删除 rawDir 本身）
 */
async function safeDeleteDir(dirPath: string, rawDir: string): Promise<void> {
    try {
        // 如果文件在子目录中（如 packageId 目录），删除整个子目录
        if (dirPath !== rawDir && dirPath.startsWith(rawDir)) {
            await fs.rm(dirPath, { recursive: true, force: true });
        } else {
            // 直接在 rawDir 下的文件，只删文件
            const files = await fs.readdir(dirPath);
            for (const file of files) {
                if (file.endsWith('.md')) {
                    await safeDelete(path.join(dirPath, file));
                }
            }
        }
    } catch {
        // 忽略清理错误
    }
}

function escapeYaml(value: string): string {
    return value.replace(/"/g, '\\"').replace(/\n/g, ' ').replace(/\r/g, '');
}
