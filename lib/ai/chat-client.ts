import { logger } from '@/lib/utils/logger';

// ════════════════════════════════════════════════════════════════
// Knowledge Web 独立 AI 客户端
// 直连 OpenAI 兼容 API（如 302.ai），彻底脱离 Console AI Gateway
// ════════════════════════════════════════════════════════════════

const AI_ENDPOINT = process.env.AI_ENDPOINT || 'https://api.302.ai/v1';
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'gemini-2.5-flash-preview-05-20';

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface OpenAIResponse {
    choices: { message: { content: string } }[];
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * 调用 OpenAI 兼容 API 进行对话
 * 直连 AI 提供商，不经过 Console 中台
 */
export async function chatAsync(
    systemPrompt: string,
    userMessage: string,
    options?: { model?: string; temperature?: number }
): Promise<string> {
    if (!AI_API_KEY) {
        throw new Error('[AI] 未配置 AI_API_KEY 环境变量，无法调用 AI 服务');
    }

    const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
    ];

    const res = await fetch(`${AI_ENDPOINT}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
            model: options?.model || AI_MODEL,
            messages,
            temperature: options?.temperature ?? 0.3,
        }),
        signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`[AI] Chat 请求失败: ${res.status} ${res.statusText} — ${errBody}`);
    }

    const data = (await res.json()) as OpenAIResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error('[AI] 返回内容为空');
    }

    logger.info('AI', `Chat 完成 (model=${options?.model || AI_MODEL})`);
    return content;
}

/**
 * 智能截断 — 对超长文章采用"头尾保留"算法
 */
export function smartTruncate(text: string, maxChars: number = 12000): string {
    if (text.length <= maxChars) return text;
    const half = Math.floor(maxChars / 2);
    return text.slice(0, half) + '\n\n... [内容已截断] ...\n\n' + text.slice(-half);
}

/**
 * 清洗 AI 返回的 JSON（移除 markdown 代码块等）
 */
export function cleanJsonResponse(raw: string): string {
    let cleaned = raw.trim();
    // 移除 ```json ... ```
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    // 尝试提取第一个 { ... } 或 [ ... ]
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);

    if (objMatch) return objMatch[0];
    if (arrMatch) return arrMatch[0];
    return cleaned;
}
