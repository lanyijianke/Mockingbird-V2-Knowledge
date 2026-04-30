/**
 * SQLite → MySQL 数据迁移脚本
 *
 * 从 SQLite 读取所有数据，批量写入 MySQL。
 * 用法: npx tsx scripts/migrate-sqlite-to-mysql.ts
 *
 * 环境变量:
 *   SQLITE_DB_PATH  — SQLite 数据库文件路径 (默认 data/knowledge.db)
 *   MYSQL_URL       — MySQL 连接字符串 (必需)
 */

import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';

// ────────────────────────────────────────────────────────────────
// loadEnvLocal — 从 .env.local 读取环境变量
// ────────────────────────────────────────────────────────────────

function loadEnvLocal(): void {
    const envPath = path.resolve(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('错误: 找不到 .env.local 文件');
        process.exit(1);
    }

    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        if (!process.env[key]) {
            process.env[key] = value;
        }
    }
}

// ────────────────────────────────────────────────────────────────
// 配置
// ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 500;

interface TableDef {
    /** MySQL 表名 */
    table: string;
    /** 查询语句 (SQLite) */
    selectSql: string;
    /** INSERT 语句模板 (MySQL)，使用 INSERT IGNORE */
    insertSql: string;
    /** 列名列表，用于绑定参数 */
    columns: string[];
    /** 对每行进行转换 (例如为缺少 Id 的 Users 生成 UUID) */
    transform?: (row: Record<string, unknown>) => Record<string, unknown>;
}

// ────────────────────────────────────────────────────────────────
// 主函数
// ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    loadEnvLocal();

    const sqlitePath = process.env.SQLITE_DB_PATH || path.join('data', 'knowledge.db');
    const resolvedSqlitePath = path.isAbsolute(sqlitePath)
        ? sqlitePath
        : path.resolve(process.cwd(), sqlitePath);

    const mysqlUrl = process.env.MYSQL_URL;
    if (!mysqlUrl) {
        console.error('错误: MYSQL_URL 环境变量未设置');
        process.exit(1);
    }

    console.log(`SQLite: ${resolvedSqlitePath}`);
    console.log(`MySQL:  ${mysqlUrl.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')}\n`);

    // 打开 SQLite
    const sqlite = new Database(resolvedSqlitePath, { readonly: true });
    sqlite.pragma('journal_mode = WAL');

    // 连接 MySQL
    const mysqlConn = await mysql.createConnection(mysqlUrl);

    // 先确保目标表已存在 (initDatabase)
    const { initDatabase } = await import('../lib/init-schema');
    await initDatabase(mysqlConn);

    console.log('MySQL 表结构已就绪\n');

    // ────────────────────────────────────────────────────────────
    // 表定义 — 按外键依赖顺序
    // ────────────────────────────────────────────────────────────

    const tables: TableDef[] = [
        {
            table: 'Users',
            selectSql: 'SELECT * FROM Users',
            insertSql: `INSERT IGNORE INTO Users (Id, Name, Email, PasswordHash, AvatarUrl, Role, MembershipExpiresAt, EmailVerifiedAt, CreatedAt, UpdatedAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            columns: ['Id', 'Name', 'Email', 'PasswordHash', 'AvatarUrl', 'Role', 'MembershipExpiresAt', 'EmailVerifiedAt', 'CreatedAt', 'UpdatedAt'],
            transform(row) {
                // 如果 Id 为空或缺失，生成 UUID
                if (!row.Id) {
                    return { ...row, Id: crypto.randomUUID() };
                }
                return row;
            },
        },
        {
            table: 'Sessions',
            selectSql: 'SELECT * FROM Sessions',
            insertSql: `INSERT IGNORE INTO Sessions (Id, Token, UserId, ExpiresAt, CreatedAt)
                        VALUES (?, ?, ?, ?, ?)`,
            columns: ['Id', 'Token', 'UserId', 'ExpiresAt', 'CreatedAt'],
        },
        {
            table: 'OauthAccounts',
            selectSql: 'SELECT * FROM OauthAccounts',
            insertSql: `INSERT IGNORE INTO OauthAccounts (Id, Provider, ProviderAccountId, UserId, CreatedAt)
                        VALUES (?, ?, ?, ?, ?)`,
            columns: ['Id', 'Provider', 'ProviderAccountId', 'UserId', 'CreatedAt'],
        },
        {
            table: 'EmailVerificationTokens',
            selectSql: 'SELECT * FROM EmailVerificationTokens',
            insertSql: `INSERT IGNORE INTO EmailVerificationTokens (Id, Token, UserId, ExpiresAt, CreatedAt)
                        VALUES (?, ?, ?, ?, ?)`,
            columns: ['Id', 'Token', 'UserId', 'ExpiresAt', 'CreatedAt'],
        },
        {
            table: 'PasswordResetTokens',
            selectSql: 'SELECT * FROM PasswordResetTokens',
            insertSql: `INSERT IGNORE INTO PasswordResetTokens (Id, Token, UserId, ExpiresAt, CreatedAt)
                        VALUES (?, ?, ?, ?, ?)`,
            columns: ['Id', 'Token', 'UserId', 'ExpiresAt', 'CreatedAt'],
        },
        {
            table: 'Prompts',
            selectSql: 'SELECT * FROM Prompts',
            insertSql: `INSERT IGNORE INTO Prompts (Id, Title, RawTitle, Description, Content, Category, Source, Author, SourceUrl, CoverImageUrl, VideoPreviewUrl, CardPreviewVideoUrl, ImagesJson, CopyCount, IsActive, CreatedAt, UpdatedAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            columns: ['Id', 'Title', 'RawTitle', 'Description', 'Content', 'Category', 'Source', 'Author', 'SourceUrl', 'CoverImageUrl', 'VideoPreviewUrl', 'CardPreviewVideoUrl', 'ImagesJson', 'CopyCount', 'IsActive', 'CreatedAt', 'UpdatedAt'],
        },
        {
            table: 'SystemLogs',
            selectSql: 'SELECT * FROM SystemLogs',
            insertSql: `INSERT IGNORE INTO SystemLogs (Id, Level, Source, Message, Detail, CreatedAt)
                        VALUES (?, ?, ?, ?, ?, ?)`,
            columns: ['Id', 'Level', 'Source', 'Message', 'Detail', 'CreatedAt'],
        },
        {
            table: 'InvitationCodes',
            selectSql: 'SELECT * FROM InvitationCodes',
            insertSql: `INSERT IGNORE INTO InvitationCodes (Id, Code, TargetRole, MembershipDurationDays, MaxUses, UsedCount, ExpiresAt, CreatedAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            columns: ['Id', 'Code', 'TargetRole', 'MembershipDurationDays', 'MaxUses', 'UsedCount', 'ExpiresAt', 'CreatedAt'],
        },
        {
            table: 'InvitationRedemptions',
            selectSql: 'SELECT * FROM InvitationRedemptions',
            insertSql: `INSERT IGNORE INTO InvitationRedemptions (Id, InvitationCodeId, UserId, RedeemedAt)
                        VALUES (?, ?, ?, ?)`,
            columns: ['Id', 'InvitationCodeId', 'UserId', 'RedeemedAt'],
        },
        {
            table: 'AcademyContent',
            selectSql: 'SELECT * FROM AcademyContent',
            insertSql: `INSERT IGNORE INTO AcademyContent (Id, Slug, Title, Summary, Content, Category, CoverImageUrl, Status, PublishedAt, CreatedAt, UpdatedAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            columns: ['Id', 'Slug', 'Title', 'Summary', 'Content', 'Category', 'CoverImageUrl', 'Status', 'PublishedAt', 'CreatedAt', 'UpdatedAt'],
        },
    ];

    let totalSource = 0;
    let totalTarget = 0;

    for (const tableDef of tables) {
        const { table, selectSql, insertSql, columns, transform } = tableDef;

        // 读取 SQLite 数据
        const rows = sqlite.prepare(selectSql).all() as Record<string, unknown>[];
        const sourceCount = rows.length;

        if (sourceCount === 0) {
            console.log(`[SKIP] ${table}: 源表为空`);
            continue;
        }

        console.log(`[MIGRATE] ${table}: ${sourceCount} 行`);

        // 批量写入 MySQL
        await mysqlConn.beginTransaction();

        try {
            let migrated = 0;

            for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                const batch = rows.slice(i, i + BATCH_SIZE);

                for (const row of batch) {
                    // 应用行级转换
                    const transformed = transform ? transform(row) : row;

                    const values = columns.map((col) => {
                        const val = transformed[col];
                        return val ?? null;
                    });

                    await mysqlConn.query(insertSql, values);
                    migrated++;
                }
            }

            await mysqlConn.commit();

            // 比较行数
            const [countResult] = await mysqlConn.query(
                `SELECT COUNT(*) AS cnt FROM ${table}`,
            ) as [Record<string, unknown>[], unknown];
            const targetCount = Number(countResult[0].cnt);

            const status = targetCount >= sourceCount ? 'OK' : 'WARN';
            console.log(`  [${status}] 源: ${sourceCount} → 目标: ${targetCount}`);

            if (targetCount < sourceCount) {
                console.log(`  警告: ${table} 目标行数少于源行数 (${targetCount}/${sourceCount})，可能有重复数据被 INSERT IGNORE 跳过`);
            }

            totalSource += sourceCount;
            totalTarget += targetCount;
        } catch (error) {
            await mysqlConn.rollback();
            console.error(`  [ERROR] ${table} 迁移失败，已回滚:`, error);
            process.exit(1);
        }
    }

    // ────────────────────────────────────────────────────────────
    // 总结
    // ────────────────────────────────────────────────────────────

    console.log('\n══════════════════════════════════════════');
    console.log(`迁移完成！总计: 源 ${totalSource} 行 → 目标 ${totalTarget} 行`);
    console.log('══════════════════════════════════════════\n');

    // 清理
    sqlite.close();
    await mysqlConn.end();
}

main().catch((err) => {
    console.error('迁移失败:', err);
    process.exit(1);
});
