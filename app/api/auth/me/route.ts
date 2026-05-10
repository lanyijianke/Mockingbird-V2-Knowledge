import { NextRequest, NextResponse } from 'next/server';
import { GetSessionToken, ClearSessionCookie } from '@/app/api/auth/helpers';
import { GetSession } from '@/lib/auth/session';
import { getEffectiveRole } from '@/lib/auth/roles';

export const runtime = 'nodejs';

async function fetchUserFromAuth(userId: string) {
    const authServiceUrl = process.env.AUTH_SERVICE_URL;
    const clientId = process.env.AUTH_CLIENT_ID;
    const clientSecret = process.env.AUTH_CLIENT_SECRET;

    if (!authServiceUrl || !clientId || !clientSecret) return null;

    try {
        const res = await fetch(new URL('/api/oauth/user-info', authServiceUrl), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, user_id: userId }),
        });

        if (!res.ok) return null;

        const data = await res.json();
        return data.user ?? null;
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    try {
        const token = GetSessionToken(request);
        if (!token) {
            return NextResponse.json({ user: null });
        }

        const session = await GetSession(token);
        if (!session) {
            return NextResponse.json(
                { user: null },
                { headers: { 'Set-Cookie': ClearSessionCookie() } },
            );
        }

        const authUser = await fetchUserFromAuth(session.UserId);
        if (!authUser) {
            return NextResponse.json(
                { user: null },
                { headers: { 'Set-Cookie': ClearSessionCookie() } },
            );
        }

        const effectiveRole = getEffectiveRole(authUser.role, authUser.membershipExpiresAt);

        return NextResponse.json({
            user: {
                id: authUser.id,
                email: authUser.email,
                name: authUser.name,
                role: effectiveRole,
                avatarUrl: authUser.avatarUrl,
                emailVerified: !!authUser.emailVerified,
                membershipExpiresAt: authUser.membershipExpiresAt,
            },
        });
    } catch (err) {
        console.error('[Me] Error:', err);
        return NextResponse.json({ error: '获取用户信息失败' }, { status: 500 });
    }
}
