import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { initDatabase } from './init-schema';

// ────────────────────────────────────────────────────────────────
// SQLite 数据库 — 替代原 MySQL 连接池
// better-sqlite3 是同步 API，零网络开销，对内容站极其高效
// ────────────────────────────────────────────────────────────────

// 通用查询参数类型
type QueryParams = (string | number | boolean | null | Buffer)[];

let db: Database.Database | null = null;

function getDb(): Database.Database {
    if (!db) {
        const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'knowledge.db');
        const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);

        // 确保目录存在
        const dir = path.dirname(resolvedPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        db = new Database(resolvedPath);

        // 性能优化
        db.pragma('journal_mode = WAL');
        db.pragma('synchronous = NORMAL');
        db.pragma('foreign_keys = ON');

        // 自动建表
        initDatabase(db);

        console.log(`[DB] SQLite 已连接: ${resolvedPath}`);
    }
    return db;
}

// ────────────────────────────────────────────────────────────────
// 类型安全的查询辅助函数
// 保持与原 MySQL 版本相同的 API 签名，使调用方零改动
// ────────────────────────────────────────────────────────────────

/**
 * 查询多行数据
 */
export async function query<T = Record<string, unknown>>(
    sql: string,
    params?: QueryParams
): Promise<T[]> {
    const stmt = getDb().prepare(sql);
    return (params ? stmt.all(...params) : stmt.all()) as T[];
}

/**
 * 查询单行数据
 */
export async function queryOne<T = Record<string, unknown>>(
    sql: string,
    params?: QueryParams
): Promise<T | null> {
    const stmt = getDb().prepare(sql);
    const row = params ? stmt.get(...params) : stmt.get();
    return (row as T) ?? null;
}

/**
 * 查询标量值（COUNT 等聚合）
 */
export async function queryScalar<T = number>(
    sql: string,
    params?: QueryParams
): Promise<T | null> {
    const stmt = getDb().prepare(sql);
    const row = params ? stmt.get(...params) : stmt.get();
    if (!row) return null;
    const firstKey = Object.keys(row as object)[0];
    return (row as Record<string, unknown>)[firstKey] as T;
}

/**
 * 执行写操作 (INSERT / UPDATE / DELETE)
 * 返回 { affectedRows, insertId } 以兼容原 MySQL ResultSetHeader
 */
export async function execute(
    sql: string,
    params?: QueryParams
): Promise<{ affectedRows: number; insertId: number }> {
    const stmt = getDb().prepare(sql);
    const result = params ? stmt.run(...params) : stmt.run();
    return {
        affectedRows: result.changes,
        insertId: Number(result.lastInsertRowid),
    };
}

/**
 * 关闭数据库（用于 graceful shutdown）
 */
export async function closePool(): Promise<void> {
    if (db) {
        db.close();
        db = null;
    }
}

export default getDb;
