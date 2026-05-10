import { nanoid } from 'nanoid';
import type { NextRequest } from 'next/server';

const STATE_COOKIE_NAME = process.env.AUTH_STATE_COOKIE_NAME || 'auth_sso_state';
const STATE_TTL_SECONDS = 600; // 10 minutes

export function createSsoState(): string {
  return nanoid(32);
}

export function setSsoStateCookie(state: string, callbackUrl?: string): string {
  const value = callbackUrl ? `${state}|${callbackUrl}` : state;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return [
    `${STATE_COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${STATE_TTL_SECONDS}`,
    secure,
  ].filter(Boolean).join('; ');
}

export function getSsoStateFromRequest(request: NextRequest): { state: string; callbackUrl?: string } | null {
  const raw = request.cookies.get(STATE_COOKIE_NAME)?.value;
  if (!raw) return null;

  const separatorIndex = raw.indexOf('|');
  if (separatorIndex === -1) {
    return { state: raw };
  }

  return {
    state: raw.slice(0, separatorIndex),
    callbackUrl: raw.slice(separatorIndex + 1) || undefined,
  };
}

export function clearSsoStateCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return [
    `${STATE_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    secure,
  ].filter(Boolean).join('; ');
}
