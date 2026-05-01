import mysql, { type RowDataPacket, type PoolConnection } from 'mysql2/promise';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { initDatabase } from '@/lib/init-schema';

const TEST_MYSQL_URL = process.env.MYSQL_URL;

describe.skipIf(!TEST_MYSQL_URL)('initDatabase', () => {
    let adminConn: mysql.Connection;

    beforeAll(async () => {
        adminConn = await mysql.createConnection(TEST_MYSQL_URL!);
    });

    afterAll(async () => {
        await adminConn.end();
    });

    async function getTableNames(conn: mysql.Connection): Promise<string[]> {
        const [rows] = await conn.query<RowDataPacket[]>(
            `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
             WHERE TABLE_SCHEMA = DATABASE()
             ORDER BY TABLE_NAME`,
        );
        return rows.map((row) => row.TABLE_NAME);
    }

    it('removes the legacy Articles table while keeping active tables available', async () => {
        const dbName = `mockingbird_test_${Date.now()}_articles`;

        await adminConn.query(`CREATE DATABASE ${dbName}`);
        const conn = await mysql.createConnection({ ...parseMySqlUrl(TEST_MYSQL_URL!), database: dbName });

        try {
            await conn.query(`
                CREATE TABLE Articles (
                    Id INT PRIMARY KEY AUTO_INCREMENT,
                    Title VARCHAR(500) NOT NULL DEFAULT ''
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);

            await initDatabase(conn as unknown as PoolConnection);

            const tableNames = await getTableNames(conn);
            expect(tableNames).not.toContain('Articles');
            expect(tableNames).toContain('Prompts');
            expect(tableNames).toContain('SystemLogs');
        } finally {
            await conn.end();
            await adminConn.query(`DROP DATABASE ${dbName}`);
        }
    });

    it('migrates legacy member roles to junior_member during initialization', async () => {
        const dbName = `mockingbird_test_${Date.now()}_roles`;

        await adminConn.query(`CREATE DATABASE ${dbName}`);
        const conn = await mysql.createConnection({ ...parseMySqlUrl(TEST_MYSQL_URL!), database: dbName });

        try {
            await initDatabase(conn as unknown as PoolConnection);

            await conn.query(
                `INSERT INTO Users (Id, Name, Email, Role) VALUES ('user-1', 'Legacy Member', 'legacy-member@example.com', 'member')`,
            );
            await conn.query(
                `INSERT INTO InvitationCodes (Code, TargetRole, ExpiresAt) VALUES ('LEGACY-001', 'member', '2099-01-01 00:00:00')`,
            );

            // Re-run init to trigger migration
            await initDatabase(conn as unknown as PoolConnection);

            const [userRows] = await conn.query<RowDataPacket[]>(
                `SELECT Role FROM Users WHERE Id = 'user-1'`,
            );
            expect(userRows[0].Role).toBe('junior_member');

            const [inviteRows] = await conn.query<RowDataPacket[]>(
                `SELECT TargetRole FROM InvitationCodes WHERE Code = 'LEGACY-001'`,
            );
            expect(inviteRows[0].TargetRole).toBe('junior_member');
        } finally {
            await conn.end();
            await adminConn.query(`DROP DATABASE ${dbName}`);
        }
    });
});

function parseMySqlUrl(url: string): { host: string; port: number; user: string; password: string } {
    const parsed = new URL(url);
    return {
        host: parsed.hostname,
        port: parseInt(parsed.port || '3306', 10),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
    };
}
