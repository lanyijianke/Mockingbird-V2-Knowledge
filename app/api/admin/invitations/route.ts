import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { query, queryOne, execute } from '@/lib/db';

export const runtime = 'nodejs';

const VALID_ROLES = ['junior_member', 'senior_member', 'founder_member'];

// ════════════════════════════════════════════════════════════════
// GET /api/admin/invitations — 列出邀请码
// ════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
    const err = verifyAdminAuth(request);
    if (err) {
        return NextResponse.json({ error: err }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const codeFilter = searchParams.get('code')?.trim().toUpperCase() || '';
    const targetRoleFilter = searchParams.get('targetRole') || '';
    const statusFilter = searchParams.get('status') || '';

    let sql = `SELECT * FROM InvitationCodes WHERE Status != 'deleted'`;
    const params: (string | number)[] = [];

    if (codeFilter) {
        sql += ` AND Code LIKE ?`;
        params.push(`%${codeFilter}%`);
    }

    if (targetRoleFilter) {
        sql += ` AND TargetRole = ?`;
        params.push(targetRoleFilter);
    }

    sql += ` ORDER BY CreatedAt DESC`;

    const rows = await query(sql, params);

    // 计算显示状态
    const now = new Date();
    const invitations = rows
        .map((row: Record<string, unknown>) => {
            const status = row.Status as string;
            const usedCount = Number(row.UsedCount) || 0;
            const maxUses = Number(row.MaxUses) || 0;
            const expiresAt = row.ExpiresAt ? new Date(row.ExpiresAt as string) : null;

            let displayStatus = '有效';
            if (status === 'disabled') displayStatus = '已停用';
            else if (status === 'deleted') displayStatus = '已删除';
            else if (expiresAt && expiresAt < now) displayStatus = '已过期';
            else if (maxUses > 0 && usedCount >= maxUses) displayStatus = '已用尽';

            return { ...row, DisplayStatus: displayStatus };
        })
        .filter((row: Record<string, unknown>) => {
            if (statusFilter && row.DisplayStatus !== statusFilter) return false;
            return true;
        });

    return NextResponse.json({ invitations });
}

// ════════════════════════════════════════════════════════════════
// POST /api/admin/invitations — 创建邀请码
// ════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
    const err = verifyAdminAuth(request);
    if (err) {
        return NextResponse.json({ error: err }, { status: 401 });
    }

    const body = await request.json();
    const { code, targetRole, membershipDurationDays, maxUses, expiresAt } = body;

    if (!code || typeof code !== 'string' || !code.trim()) {
        return NextResponse.json({ error: '邀请码不能为空' }, { status: 400 });
    }

    if (!VALID_ROLES.includes(targetRole)) {
        return NextResponse.json(
            { error: '目标角色必须是 junior_member、senior_member 或 founder_member' },
            { status: 400 },
        );
    }

    if (!expiresAt) {
        return NextResponse.json({ error: '过期时间不能为空' }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();

    // 检查唯一性
    const existing = await queryOne<{ Id: number }>(
        `SELECT Id FROM InvitationCodes WHERE Code = ?`,
        [normalizedCode],
    );
    if (existing) {
        return NextResponse.json({ error: '邀请码已存在' }, { status: 409 });
    }

    const result = await execute(
        `INSERT INTO InvitationCodes (Code, TargetRole, MembershipDurationDays, MaxUses, ExpiresAt, Status, UsedCount)
         VALUES (?, ?, ?, ?, ?, 'active', 0)`,
        [
            normalizedCode,
            targetRole,
            membershipDurationDays || 30,
            maxUses || 1,
            expiresAt,
        ],
    );

    return NextResponse.json({ success: true, id: result.insertId }, { status: 201 });
}
