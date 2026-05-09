import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { queryOne, execute } from '@/lib/db';

export const runtime = 'nodejs';

const VALID_ROLES = ['junior_member', 'senior_member', 'founder_member'];

// ════════════════════════════════════════════════════════════════
// PATCH /api/admin/invitations/:id — 更新邀请码
// ════════════════════════════════════════════════════════════════

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const err = verifyAdminAuth(request);
    if (err) {
        return NextResponse.json({ error: err }, { status: 401 });
    }

    const { id } = await params;

    const body = await request.json();
    const { code, targetRole, membershipDurationDays, maxUses, expiresAt, status } = body;

    if (code !== undefined && (!code || typeof code !== 'string' || !code.trim())) {
        return NextResponse.json({ error: '邀请码不能为空' }, { status: 400 });
    }

    if (targetRole !== undefined && !VALID_ROLES.includes(targetRole)) {
        return NextResponse.json(
            { error: '目标角色必须是 junior_member、senior_member 或 founder_member' },
            { status: 400 },
        );
    }

    // 检查记录存在
    const existing = await queryOne<{ Id: number }>(
        `SELECT Id FROM InvitationCodes WHERE Id = ?`,
        [Number(id)],
    );
    if (!existing) {
        return NextResponse.json({ error: '邀请码不存在' }, { status: 404 });
    }

    // 检查 code 唯一性（排除自身）
    if (code && code.trim()) {
        const normalizedCode = code.trim().toUpperCase();
        const duplicate = await queryOne<{ Id: number }>(
            `SELECT Id FROM InvitationCodes WHERE Code = ? AND Id != ?`,
            [normalizedCode, Number(id)],
        );
        if (duplicate) {
            return NextResponse.json({ error: '邀请码已存在' }, { status: 409 });
        }
    }

    const setClauses: string[] = [];
    const sqlParams: (string | number)[] = [];

    if (code !== undefined) {
        setClauses.push('Code = ?');
        sqlParams.push(code.trim().toUpperCase());
    }
    if (targetRole !== undefined) {
        setClauses.push('TargetRole = ?');
        sqlParams.push(targetRole);
    }
    if (membershipDurationDays !== undefined) {
        setClauses.push('MembershipDurationDays = ?');
        sqlParams.push(membershipDurationDays);
    }
    if (maxUses !== undefined) {
        setClauses.push('MaxUses = ?');
        sqlParams.push(maxUses);
    }
    if (expiresAt !== undefined) {
        setClauses.push('ExpiresAt = ?');
        sqlParams.push(expiresAt);
    }
    if (status !== undefined) {
        setClauses.push('Status = ?');
        sqlParams.push(status);
    }

    if (setClauses.length === 0) {
        return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 });
    }

    sqlParams.push(Number(id));
    await execute(
        `UPDATE InvitationCodes SET ${setClauses.join(', ')} WHERE Id = ?`,
        sqlParams,
    );

    return NextResponse.json({ success: true });
}

// ════════════════════════════════════════════════════════════════
// DELETE /api/admin/invitations/:id — 软删除邀请码
// ════════════════════════════════════════════════════════════════

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const err = verifyAdminAuth(request);
    if (err) {
        return NextResponse.json({ error: err }, { status: 401 });
    }

    const { id } = await params;

    await execute(
        `UPDATE InvitationCodes SET Status = 'deleted' WHERE Id = ?`,
        [Number(id)],
    );

    return NextResponse.json({ success: true });
}
