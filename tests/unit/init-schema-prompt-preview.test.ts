import mysql, { type RowDataPacket, type PoolConnection } from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initDatabase } from '@/lib/init-schema';

const TEST_MYSQL_URL = process.env.MYSQL_URL;

describe.skipIf(!TEST_MYSQL_URL)('initDatabase prompt preview migration', () => {
    let adminConn: mysql.Connection;

    beforeAll(async () => {
        adminConn = await mysql.createConnection(TEST_MYSQL_URL!);
    });

    afterAll(async () => {
        await adminConn.end();
    });

    it('adds CardPreviewVideoUrl to an existing Prompts table without dropping data', async () => {
        const dbName = `mockingbird_test_${Date.now()}_preview`;

        await adminConn.query(`CREATE DATABASE ${dbName}`);
        const conn = await mysql.createConnection({ ...parseMySqlUrl(TEST_MYSQL_URL!), database: dbName });

        try {
            // Create a minimal Prompts table without CardPreviewVideoUrl
            await conn.query(`
                CREATE TABLE Prompts (
                    Id INT PRIMARY KEY AUTO_INCREMENT,
                    Title VARCHAR(500) NOT NULL DEFAULT '',
                    VideoPreviewUrl VARCHAR(1000) DEFAULT NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            await conn.query(
                `INSERT INTO Prompts (Title, VideoPreviewUrl) VALUES ('existing prompt', '/content/prompts/media/full.mp4')`,
            );

            await initDatabase(conn as unknown as PoolConnection);

            // Verify CardPreviewVideoUrl column exists via INFORMATION_SCHEMA
            const [colRows] = await conn.query<RowDataPacket[]>(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Prompts' AND COLUMN_NAME = 'CardPreviewVideoUrl'`,
            );
            expect(colRows.length).toBeGreaterThan(0);

            // Verify existing data is preserved
            const [dataRows] = await conn.query<RowDataPacket[]>(
                `SELECT Title, VideoPreviewUrl, CardPreviewVideoUrl FROM Prompts LIMIT 1`,
            );

            expect(dataRows[0]).toEqual({
                Title: 'existing prompt',
                VideoPreviewUrl: '/content/prompts/media/full.mp4',
                CardPreviewVideoUrl: null,
            });
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
