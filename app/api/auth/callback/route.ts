import { NextRequest, NextResponse } from 'next/server';
import { exchangeSsoCode } from '@/lib/auth/sso-client';
import { getSsoStateFromRequest, clearSsoStateCookie } from '@/lib/auth/sso-state';
import { CreateSession } from '@/lib/auth/session';
import { SetSessionCookie } from '@/app/api/auth/helpers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(new URL('/login?error=missing_params', request.url));
  }

  const storedState = getSsoStateFromRequest(request);
  if (!storedState || storedState.state !== state) {
    return NextResponse.redirect(new URL('/login?error=invalid_state', request.url));
  }

  const callbackUrl = storedState.callbackUrl || '/';
  const redirectUri = process.env.AUTH_CALLBACK_URL || 'http://localhost:5046/api/auth/callback';

  try {
    const result = await exchangeSsoCode(code, redirectUri);

    // 只创建本地 session，用户数据由 Auth 管理
    const sessionToken = await CreateSession(result.user.id);

    return NextResponse.redirect(new URL(callbackUrl, request.url), {
      headers: {
        'Set-Cookie': [
          SetSessionCookie(sessionToken),
          clearSsoStateCookie(),
        ].join(', '),
      },
    });
  } catch (err) {
    console.error('[SSO Callback] Error:', err);
    return NextResponse.redirect(new URL('/login?error=sso_failed', request.url));
  }
}
