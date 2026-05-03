import mysql from 'mysql2/promise';

// ────────────────────────────────────────────────────────────────
// 中台数据库 — mockingbird_console (只读)
// ────────────────────────────────────────────────────────────────

type QueryParams = (string | number | boolean | null | Buffer | Date)[];

let pool: mysql.Pool | null = null;

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
    for (const key of Object.keys(row)) {
        if (row[key] instanceof Date) {
            const d = row[key] as Date;
            const pad = (n: number) => String(n).padStart(2, '0');
            // mysql2 dateframe=true 时返回本地时间 Date，
            // 用 toISOString 拿 UTC 然后统一 +8 转北京时间
            const utcMs = d.getTime() - d.getTimezoneOffset() * 60 * 1000;
            const bj = new Date(utcMs + 8 * 60 * 60 * 1000);
            row[key] = `${bj.getUTCFullYear()}-${pad(bj.getUTCMonth() + 1)}-${pad(bj.getUTCDate())} ${pad(bj.getUTCHours())}:${pad(bj.getUTCMinutes())}:${pad(bj.getUTCSeconds())}`;
        }
    }
    return row;
}

async function getPool(): Promise<mysql.Pool> {
    if (!pool) {
        const url = process.env.CONSOLE_DB_URL;
        if (!url) {
            throw new Error('CONSOLE_DB_URL 环境变量未设置');
        }

        pool = mysql.createPool({
            uri: url,
            waitForConnections: true,
            connectionLimit: 5,
            charset: 'utf8mb4',
        });

        console.log('[DB-Console] 中台数据库已连接');
    }
    return pool;
}

export async function query<T = Record<string, unknown>>(
    sql: string,
    params?: QueryParams
): Promise<T[]> {
    const [rows] = await (await getPool()).query(sql, params);
    return (rows as Record<string, unknown>[]).map(serializeRow) as T[];
}

export async function queryOne<T = Record<string, unknown>>(
    sql: string,
    params?: QueryParams
): Promise<T | null> {
    const [rows] = await (await getPool()).query(sql, params);
    const arr = (rows as Record<string, unknown>[]).map(serializeRow) as T[];
    return arr.length > 0 ? arr[0] : null;
}

export async function closePool(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
