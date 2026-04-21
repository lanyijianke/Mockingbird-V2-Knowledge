import { logger } from '@/lib/utils/logger';

// ════════════════════════════════════════════════════════════════
// Console 数据同步客户端（纯数据，不含 AI）
// 仅用于 Article Pipeline 从 Console 拉取/回调数据
// ════════════════════════════════════════════════════════════════

const CONSOLE_BASE = process.env.CONSOLE_API_BASE_URL || 'http://localhost:5299';

/**
 * 从 Console ExternalApi 拉取数据
 */
export async function fetchFromConsole<T>(path: string): Promise<T | null> {
    try {
        const res = await fetch(`${CONSOLE_BASE}${path}`, {
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
            logger.warn('ConsoleClient', `${path} → ${res.status}`);
            return null;
        }

        return (await res.json()) as T;
    } catch (err) {
        logger.error('ConsoleClient', `${path} 请求失败:`, err);
        return null;
    }
}

/**
 * 向 Console 发送 POST 请求
 */
export async function postToConsole<T>(path: string, body: unknown): Promise<T | null> {
    try {
        const res = await fetch(`${CONSOLE_BASE}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
            logger.warn('ConsoleClient', `POST ${path} → ${res.status}`);
            return null;
        }

        return (await res.json()) as T;
    } catch (err) {
        logger.error('ConsoleClient', `POST ${path} 请求失败:`, err);
        return null;
    }
}
