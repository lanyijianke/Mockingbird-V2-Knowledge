export interface SsoUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  role: string;
}

export interface ExchangeCodeResult {
  accessToken: string;
  expiresIn: number;
  user: SsoUser;
}

export async function exchangeSsoCode(code: string, redirectUri: string): Promise<ExchangeCodeResult> {
  const authServiceUrl = process.env.AUTH_SERVICE_URL;
  const clientId = process.env.AUTH_CLIENT_ID;
  const clientSecret = process.env.AUTH_CLIENT_SECRET;

  if (!authServiceUrl || !clientId || !clientSecret) {
    throw new Error('AUTH_SERVICE_URL, AUTH_CLIENT_ID, and AUTH_CLIENT_SECRET must be configured');
  }

  const response = await fetch(new URL('/api/oauth/token', authServiceUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || 'SSO code exchange failed');
  }

  return {
    accessToken: body.access_token,
    expiresIn: body.expires_in,
    user: body.user,
  };
}
