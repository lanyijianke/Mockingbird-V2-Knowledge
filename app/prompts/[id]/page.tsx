import { notFound } from 'next/navigation';
import { getPromptById, getAllPromptIds, getRelatedPrompts } from '@/lib/services/prompt-service';
import { getCategoryName } from '@/lib/categories';
import type { Metadata } from 'next';
import { buildBreadcrumbJsonLd, JsonLdScript } from '@/lib/utils/json-ld';
import PromptDetailClient from './PromptDetailClient';
import { safeJsonParse } from '../safeJsonParse';
import './prompt-detail.css';

const SITE_URL = process.env.SITE_URL || 'https://aigcclub.com.cn';

export const runtime = 'nodejs';
export const revalidate = 3600;

export async function generateStaticParams() {
    const ids = await getAllPromptIds();
    // 只预生成最新 100 个，其余按需生成
    return ids.slice(0, 100).map((id) => ({ id: String(id) }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const prompt = await getPromptById(parseInt(id, 10));
    if (!prompt) return { title: '提示词未找到' };

    return {
        title: `${prompt.title} — 提示词`,
        description: prompt.description || prompt.content.slice(0, 160),
        alternates: { canonical: `/prompts/${id}` },
        openGraph: {
            title: prompt.title,
            description: prompt.description || undefined,
            url: `${SITE_URL}/prompts/${id}`,
            images: prompt.coverImageUrl ? [prompt.coverImageUrl] : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title: prompt.title,
            description: prompt.description || undefined,
            images: prompt.coverImageUrl ? [prompt.coverImageUrl] : undefined,
        },
    };
}

export default async function PromptDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const prompt = await getPromptById(parseInt(id, 10));
    if (!prompt) notFound();

    // 获取同分类推荐提示词
    const relatedPrompts = await getRelatedPrompts(prompt.category, prompt.id, 6);

    // 解析图片 JSON
    let images: string[] = [];
    if (prompt.imagesJson) {
        images = safeJsonParse<string[]>(prompt.imagesJson, []);
    }

    // 检测是否为 JSON 内容
    const isJson = prompt.content.trim().startsWith('{') || prompt.content.trim().startsWith('[');

    const dateStr = new Date(prompt.createdAt).toLocaleDateString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <>
            {/* SEO: BreadcrumbList JSON-LD */}
            <JsonLdScript data={buildBreadcrumbJsonLd([
                { name: '首页', url: SITE_URL },
                { name: '提示词', url: `${SITE_URL}/prompts` },
                { name: prompt.title, url: `${SITE_URL}/prompts/${id}` },
            ])} />

            <PromptDetailClient
                images={images}
                content={prompt.content}
                videoUrl={prompt.videoPreviewUrl}
                title={prompt.title}
                categoryName={getCategoryName(prompt.category)}
                description={prompt.description || ''}
                author={prompt.author || ''}
                copyCount={prompt.copyCount}
                dateStr={dateStr}
                sourceUrl={prompt.sourceUrl}
                isJson={isJson}
                relatedPrompts={relatedPrompts.map(p => ({
                    id: p.id,
                    title: p.title,
                    coverImageUrl: p.coverImageUrl,
                    category: getCategoryName(p.category),
                    copyCount: p.copyCount,
                }))}
            />
        </>
    );
}
