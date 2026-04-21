import { writeLog, serializeError, type LogLevel as DbLogLevel } from '@/lib/services/log-service';

// ════════════════════════════════════════════════════════════════
// 统一日志工具 — 替代散布各处的 console.log/warn/error
// 支持日志级别控制 (LOG_LEVEL 环境变量)
// warn/error 级别自动持久化到 SQLite SystemLogs 表
// ════════════════════════════════════════════════════════════════

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    silent: 4,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
    return LEVELS[level] >= LEVELS[currentLevel];
}

function formatTag(tag: string): string {
    return `[${tag}]`;
}

export const logger = {
    debug(tag: string, message: string, ...args: unknown[]) {
        if (shouldLog('debug')) console.debug(formatTag(tag), message, ...args);
    },

    info(tag: string, message: string, ...args: unknown[]) {
        if (shouldLog('info')) console.log(formatTag(tag), message, ...args);
    },

    warn(tag: string, message: string, ...args: unknown[]) {
        if (shouldLog('warn')) console.warn(formatTag(tag), message, ...args);
        // 自动持久化到 DB
        const detail = args.length > 0 ? serializeError(args[0]) : null;
        writeLog('warn' as DbLogLevel, tag, message, detail).catch(() => {});
    },

    error(tag: string, message: string, ...args: unknown[]) {
        if (shouldLog('error')) console.error(formatTag(tag), message, ...args);
        // 自动持久化到 DB
        const detail = args.length > 0 ? serializeError(args[0]) : null;
        writeLog('error' as DbLogLevel, tag, message, detail).catch(() => {});
    },

    /**
     * 显式写入 info 级别的持久化日志（用于 Job 周期摘要等）
     * 区别于普通 info()：此方法会写入 DB
     */
    persist(tag: string, message: string, detail?: string) {
        if (shouldLog('info')) console.log(formatTag(tag), message);
        writeLog('info' as DbLogLevel, tag, message, detail ?? null).catch(() => {});
    },
};
