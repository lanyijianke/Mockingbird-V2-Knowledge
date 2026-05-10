import { NextRequest } from 'next/server';

// ════════════════════════════════════════════════════════════════
// Auth 辅助函数 — cookie 读写
// ════════════════════════════════════════════════════════════════

const SESSION_COOKIE_NAME = 'session_token';
const SESSION_TTL_SECONDS = 30 * 86400; // 30 天

/**
 * 从请求的 cookie 中读取 session_token
 */
export function GetSessionToken(request: NextRequest): string | undefined {
    return request.cookies.get(SESSION_COOKIE_NAME)?.value;
}

/**
 * 生成 Set-Cookie header 字符串：写入 session token
 */
export function SetSessionCookie(token: string): string {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return [
        `${SESSION_COOKIE_NAME}=${token}`,
        `Path=/`,
        `HttpOnly`,
        `SameSite=Lax`,
        `Max-Age=${SESSION_TTL_SECONDS}`,
        secure,
    ]
        .filter(Boolean)
        .join('; ');
}

/**
 * 生成 Set-Cookie header 字符串：清除 session token
 */
export function ClearSessionCookie(): string {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return [
        `${SESSION_COOKIE_NAME}=`,
        `Path=/`,
        `HttpOnly`,
        `SameSite=Lax`,
        `Max-Age=0`,
        secure,
    ]
        .filter(Boolean)
        .join('; ');
}
