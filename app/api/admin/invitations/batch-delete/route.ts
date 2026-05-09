import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { execute } from '@/lib/db';

export const runtime = 'nodejs';

// ════════════════════════════════════════════════════════════════
// POST /api/admin/invitations/batch-delete — 批量软删除
// ════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
    const err = verifyAdminAuth(request);
    if (err) {
        return NextResponse.json({ error: err }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: '请提供要删除的 ID 列表' }, { status: 400 });
    }

    const numericIds = ids.map((id: unknown) => Number(id)).filter((n) => !isNaN(n));
    if (numericIds.length === 0) {
        return NextResponse.json({ error: '没有有效的 ID' }, { status: 400 });
    }

    const placeholders = numericIds.map(() => '?').join(', ');
    const result = await execute(
        `UPDATE InvitationCodes SET Status = 'deleted' WHERE Id IN (${placeholders})`,
        numericIds,
    );

    return NextResponse.json({ success: true, count: result.affectedRows });
}
