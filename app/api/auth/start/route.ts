import { NextRequest, NextResponse } from 'next/server';
import { createSsoState, setSsoStateCookie } from '@/lib/auth/sso-state';

export const runtime = 'nodejs';

const MODE_TO_PATH: Record<string, string> = {
  login: '/login',
  register: '/register',
  'forgot-password': '/forgot-password',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'login';
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const authServiceUrl = process.env.AUTH_SERVICE_URL;
  const clientId = process.env.AUTH_CLIENT_ID;
  const redirectUri = process.env.AUTH_CALLBACK_URL;

  if (!authServiceUrl || !clientId || !redirectUri) {
    return NextResponse.json({ error: 'SSO not configured' }, { status: 500 });
  }

  const state = createSsoState();
  const targetPath = MODE_TO_PATH[mode] || '/login';

  const ssoParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });

  const redirectTarget = `${authServiceUrl}${targetPath}?${ssoParams.toString()}`;

  return NextResponse.redirect(redirectTarget, {
    headers: { 'Set-Cookie': setSsoStateCookie(state, callbackUrl) },
  });
}
