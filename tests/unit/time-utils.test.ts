/**
 * time-utils.ts 单元测试
 * 测试北京时间格式化（3 种风格）
 */
import { describe, it, expect } from 'vitest';
import { formatBeijingDate, formatBeijingShortDate, formatBeijingDateCN } from '@/lib/utils/time-utils';

describe('formatBeijingDate', () => {
    it('UTC 日期应转换为北京时间英文格式 (MMM DD, YYYY)', () => {
        // UTC 2024-01-15 16:00 → 北京时间 2024-01-16 00:00
        const result = formatBeijingDate('2024-01-15T16:00:00Z');
        expect(result).toBe('JAN 16, 2024');
    });

    it('北京时间当天的日期应保持当天', () => {
        // UTC 2024-03-10 02:00 → 北京时间 2024-03-10 10:00
        const result = formatBeijingDate('2024-03-10T02:00:00Z');
        expect(result).toBe('MAR 10, 2024');
    });

    it('月份应为大写英文缩写', () => {
        const result = formatBeijingDate('2024-06-15T00:00:00Z');
        expect(result).toMatch(/^[A-Z]{3}\s+\d+,\s+\d{4}$/);
    });
});

describe('formatBeijingShortDate', () => {
    it('格式应为 YYYY.MM.DD', () => {
        const result = formatBeijingShortDate('2024-03-10T02:00:00Z');
        expect(result).toBe('2024.03.10');
    });

    it('月和日应补零', () => {
        const result = formatBeijingShortDate('2024-01-05T00:00:00Z');
        expect(result).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
        expect(result).toContain('.01.');
        expect(result).toContain('.05');
    });

    it('跨日转换应正确', () => {
        // UTC 23:30 → 北京时间次日 07:30
        const result = formatBeijingShortDate('2024-12-31T23:30:00Z');
        expect(result).toBe('2025.01.01');
    });
});

describe('formatBeijingDateCN', () => {
    it('格式应为中文日期', () => {
        const result = formatBeijingDateCN('2024-03-10T02:00:00Z');
        expect(result).toContain('2024');
        expect(result).toContain('3');
        expect(result).toContain('10');
    });

    it('应包含年月日中文标识', () => {
        const result = formatBeijingDateCN('2024-06-15T00:00:00Z');
        expect(result).toContain('年');
        expect(result).toContain('月');
        expect(result).toContain('日');
    });
});
