// ════════════════════════════════════════════════════════════════
// 通用内存缓存 — 替代散布在各 Service 中的重复实现
// 支持 TTL 过期、maxSize 容量限制和定期清理
// ════════════════════════════════════════════════════════════════

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

export class MemoryCache<T = unknown> {
    private readonly store = new Map<string, CacheEntry<T>>();
    private readonly ttlMs: number;
    private readonly maxSize: number;
    private sweepTimer: ReturnType<typeof setInterval> | null = null;

    /**
     * @param ttlMs   默认过期时间（毫秒），默认 10 分钟
     * @param maxSize 最大缓存条目数，默认 500
     */
    constructor(ttlMs: number = 10 * 60 * 1000, maxSize: number = 500) {
        this.ttlMs = ttlMs;
        this.maxSize = maxSize;

        // 每 5 分钟自动清理过期条目
        this.sweepTimer = setInterval(() => this.sweep(), 5 * 60 * 1000);
        // 允许 Node.js 进程正常退出
        if (this.sweepTimer && typeof this.sweepTimer === 'object' && 'unref' in this.sweepTimer) {
            this.sweepTimer.unref();
        }
    }

    /** 获取缓存值，过期则返回 null 并惰性删除 */
    get(key: string): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() >= entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.data;
    }

    /** 写入缓存，可选覆盖默认 TTL */
    set(key: string, data: T, ttlMs?: number): void {
        // 容量满时先清理过期，再淘汰最旧条目
        if (this.store.size >= this.maxSize) {
            this.sweep();
            if (this.store.size >= this.maxSize) {
                const firstKey = this.store.keys().next().value;
                if (firstKey !== undefined) this.store.delete(firstKey);
            }
        }
        this.store.set(key, {
            data,
            expiresAt: Date.now() + (ttlMs ?? this.ttlMs),
        });
    }

    /** 删除指定 key */
    delete(key: string): void {
        this.store.delete(key);
    }

    /** 清除全部缓存 */
    clear(): void {
        this.store.clear();
    }

    /** 当前缓存条目数 */
    get size(): number {
        return this.store.size;
    }

    /** 清理所有过期条目 */
    private sweep(): void {
        const now = Date.now();
        for (const [key, entry] of this.store) {
            if (now >= entry.expiresAt) {
                this.store.delete(key);
            }
        }
    }

    /** 关闭定时器（用于 graceful shutdown） */
    dispose(): void {
        if (this.sweepTimer) {
            clearInterval(this.sweepTimer);
            this.sweepTimer = null;
        }
    }
}
