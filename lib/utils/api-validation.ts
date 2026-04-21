// ════════════════════════════════════════════════════════════════
// API 参数校验工具函数
// 提供分页参数的解析、范围校验和安全默认值
// ════════════════════════════════════════════════════════════════

/**
 * 安全解析分页参数，自动限制范围防止恶意请求
 */
export function parsePaginationParams(searchParams: URLSearchParams): {
    page: number;
    pageSize: number;
} {
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawPageSize = parseInt(searchParams.get('pageSize') || '12', 10);

    return {
        page: Math.max(1, isNaN(rawPage) ? 1 : rawPage),
        pageSize: Math.min(100, Math.max(1, isNaN(rawPageSize) ? 12 : rawPageSize)),
    };
}

/**
 * 安全解析 count 参数（用于 top-N 查询），上限 50
 */
export function parseCountParam(searchParams: URLSearchParams, defaultValue: number = 9): number {
    const raw = parseInt(searchParams.get('count') || String(defaultValue), 10);
    return Math.min(50, Math.max(1, isNaN(raw) ? defaultValue : raw));
}

/**
 * 安全解析搜索 query，去除首尾空白，长度限制 200 字符
 */
export function parseSearchQuery(searchParams: URLSearchParams): string | undefined {
    const q = searchParams.get('q')?.trim();
    if (!q) return undefined;
    return q.slice(0, 200);
}

/**
 * 安全解析 category 参数，只允许字母数字和连字符
 */
export function parseCategoryParam(searchParams: URLSearchParams): string | undefined {
    const raw = searchParams.get('category')?.trim();
    if (!raw) return undefined;
    // 只允许合法分类编码格式 (字母、数字、连字符)
    if (!/^[a-zA-Z0-9-]+$/.test(raw)) return undefined;
    return raw;
}
