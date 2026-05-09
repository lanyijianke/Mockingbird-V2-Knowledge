import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

// ════════════════════════════════════════════════════════════════
// GET /api/admin/users — 用户列表（只读）
// ════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
    const err = verifyAdminAuth(request);
    if (err) {
        return NextResponse.json({ error: err }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword')?.trim() || '';

    let sql = `SELECT Id, Name, Email, Role, MembershipExpiresAt, EmailVerifiedAt, Status, CreatedAt
               FROM Users
               WHERE Status != 'deleted'`;
    const params: string[] = [];

    if (keyword) {
        sql += ` AND (Name LIKE ? OR Email LIKE ?)`;
        params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ` ORDER BY CreatedAt DESC`;

    const users = await query(sql, params);

    return NextResponse.json({ users });
}
