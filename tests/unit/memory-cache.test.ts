/**
 * memory-cache.ts 单元测试
 * 测试通用内存缓存：TTL 过期、maxSize 淘汰、sweep 清理
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryCache } from '@/lib/utils/memory-cache';

describe('MemoryCache', () => {
    let cache: MemoryCache<string>;

    beforeEach(() => {
        vi.useFakeTimers();
        cache = new MemoryCache<string>(1000, 5); // 1s TTL, max 5
    });

    afterEach(() => {
        cache.dispose();
        vi.useRealTimers();
    });

    // ─── 基础 CRUD ───

    it('get 未设置的 key 返回 null', () => {
        expect(cache.get('nonexistent')).toBeNull();
    });

    it('set 后 get 应返回值', () => {
        cache.set('key1', 'value1');
        expect(cache.get('key1')).toBe('value1');
    });

    it('delete 应移除条目', () => {
        cache.set('key1', 'value1');
        cache.delete('key1');
        expect(cache.get('key1')).toBeNull();
    });

    it('clear 应清空全部', () => {
        cache.set('k1', 'v1');
        cache.set('k2', 'v2');
        expect(cache.size).toBe(2);
        cache.clear();
        expect(cache.size).toBe(0);
    });

    // ─── TTL 过期 ───

    it('TTL 过期后 get 返回 null（惰性删除）', () => {
        cache.set('key1', 'value1');
        expect(cache.get('key1')).toBe('value1');

        vi.advanceTimersByTime(1001); // 超过 1s TTL
        expect(cache.get('key1')).toBeNull();
    });

    it('自定义 TTL 应覆盖默认值', () => {
        cache.set('short', 'data', 500); // 500ms TTL
        cache.set('long', 'data', 5000); // 5s TTL

        vi.advanceTimersByTime(600);
        expect(cache.get('short')).toBeNull();
        expect(cache.get('long')).toBe('data');
    });

    it('未过期的条目应正常返回', () => {
        cache.set('key1', 'value1');
        vi.advanceTimersByTime(500); // 还没到 1s TTL
        expect(cache.get('key1')).toBe('value1');
    });

    // ─── maxSize 淘汰 ───

    it('超出 maxSize 应淘汰最旧条目', () => {
        // maxSize = 5
        cache.set('k1', 'v1');
        cache.set('k2', 'v2');
        cache.set('k3', 'v3');
        cache.set('k4', 'v4');
        cache.set('k5', 'v5');
        expect(cache.size).toBe(5);

        // 第 6 个应触发淘汰
        cache.set('k6', 'v6');
        expect(cache.size).toBeLessThanOrEqual(5);
        expect(cache.get('k6')).toBe('v6');
    });

    // ─── size 属性 ───

    it('size 应反映当前条目数', () => {
        expect(cache.size).toBe(0);
        cache.set('k1', 'v1');
        expect(cache.size).toBe(1);
        cache.set('k2', 'v2');
        expect(cache.size).toBe(2);
        cache.delete('k1');
        expect(cache.size).toBe(1);
    });

    // ─── dispose ───

    it('dispose 后应停止定时器', () => {
        cache.dispose();
        // 不应抛异常
        expect(() => cache.dispose()).not.toThrow();
    });
});
