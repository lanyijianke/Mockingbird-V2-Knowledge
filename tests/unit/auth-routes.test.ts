import mysql, { type RowDataPacket, type PoolConnection } from 'mysql2/promise';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initDatabase } from '@/lib/init-schema';

const TEST_MYSQL_URL = process.env.MYSQL_URL;

describe.skipIf(!TEST_MYSQL_URL)('auth routes', () => {
    let adminConn: mysql.Connection;
    const testDatabases: string[] = [];

    beforeAll(async () => {
        adminConn = await mysql.createConnection(TEST_MYSQL_URL!);
    });

    afterAll(async () => {
        for (const dbName of testDatabases) {
            try {
                await adminConn.query(`DROP DATABASE ${dbName}`);
            } catch {
                // ignore
            }
        }
        await adminConn.end();
    });

    async function createTestDatabase(): Promise<string> {
        const dbName = `mockingbird_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await adminConn.query(`CREATE DATABASE ${dbName}`);
        testDatabases.push(dbName);
        return dbName;
    }

    async function setupDatabase(dbName: string): Promise<mysql.Connection> {
        const conn = await mysql.createConnection({ ...parseMySqlUrl(TEST_MYSQL_URL!), database: dbName });
        await initDatabase(conn as unknown as PoolConnection);
        return conn;
    }

    async function closeAppDb(): Promise<void> {
        const { closePool } = await import('@/lib/db');
        await closePool();
    }

    beforeEach(() => {
        vi.resetAllMocks();
        vi.resetModules();
    });

    afterEach(async () => {
        await closeAppDb();
        delete process.env.MYSQL_URL;
    });

    it('GET /api/auth/me returns a null user with 200 for anonymous requests', async () => {
        const dbName = await createTestDatabase();
        await setupDatabase(dbName);

        const testUrl = buildTestUrl(TEST_MYSQL_URL!, dbName);
        process.env.MYSQL_URL = testUrl;

        const { GET } = await import('@/app/api/auth/me/route');
        const request = new NextRequest('http://localhost:5046/api/auth/me');

        const response = await GET(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ user: null });
    });

    it('GET /api/auth/me returns membershipExpiresAt and treats expired members as user', async () => {
        const dbName = await createTestDatabase();
        const userId = crypto.randomUUID();
        const setupConn = await setupDatabase(dbName);
        await setupConn.query(
            `INSERT INTO Users (Id, Name, Email, Role, MembershipExpiresAt, EmailVerifiedAt)
             VALUES (?, 'Expired Member', 'expired-member@example.com', 'senior_member', '2024-01-01 00:00:00', NOW())`,
            [userId],
        );
        await setupConn.end();

        // Create session directly
        const testUrl = buildTestUrl(TEST_MYSQL_URL!, dbName);
        process.env.MYSQL_URL = testUrl;

        const { CreateSession } = await import('@/lib/auth/session');
        const { SetSessionCookie } = await import('@/app/api/auth/helpers');
        const token = await CreateSession(userId);

        const { GET } = await import('@/app/api/auth/me/route');
        const request = new NextRequest('http://localhost:5046/api/auth/me', {
            headers: {
                cookie: SetSessionCookie(token),
            },
        });

        const response = await GET(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({
            user: {
                id: userId,
                email: 'expired-member@example.com',
                name: 'Expired Member',
                role: 'user',
                avatarUrl: null,
                emailVerified: true,
                hasPassword: false,
                membershipExpiresAt: '2024-01-01 00:00:00',
                oauthProviders: [],
            },
        });
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

function buildTestUrl(baseUrl: string, database: string): string {
    const parsed = new URL(baseUrl);
    parsed.pathname = database;
    return parsed.toString();
}
