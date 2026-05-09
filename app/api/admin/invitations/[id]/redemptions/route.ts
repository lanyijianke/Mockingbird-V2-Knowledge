import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

// ════════════════════════════════════════════════════════════════
// GET /api/admin/invitations/:id/redemptions — 兑换记录
// ════════════════════════════════════════════════════════════════

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const err = verifyAdminAuth(request);
    if (err) {
        return NextResponse.json({ error: err }, { status: 401 });
    }

    const { id } = await params;

    const redemptions = await query(
        `SELECT
            ir.Id,
            ir.InvitationCodeId,
            ir.UserId,
            ir.RedeemedAt,
            u.Name AS UserName,
            u.Email AS UserEmail
         FROM InvitationRedemptions ir
         LEFT JOIN Users u ON ir.UserId = u.Id
         WHERE ir.InvitationCodeId = ?
         ORDER BY ir.RedeemedAt DESC`,
        [Number(id)],
    );

    return NextResponse.json({ redemptions });
}
