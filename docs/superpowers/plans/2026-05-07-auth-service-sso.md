# Auth Service SSO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a separate `Mockingbird_V2_Auth` project and GitHub repository, then convert `Mockingbird_V2_Website` to use it through authorization-code SSO.

**Architecture:** Build a standalone Next.js Auth Service that owns identity, password auth, email verification, password reset, OAuth account binding, SSO clients, and one-time authorization codes. The Website becomes an SSO client: it redirects users to the Auth Service, exchanges callback codes server-side, upserts a local user mirror, and keeps Website-only membership logic local.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, mysql2, bcryptjs, nanoid, Resend, Vitest, GitHub CLI.

---

## File Structure

### New Auth Repository: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth`

- Create `package.json`: scripts and dependencies for the standalone auth app.
- Create `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `next-env.d.ts`: baseline Next/Vitest config matching Website patterns.
- Create `app/layout.tsx`, `app/page.tsx`, `app/globals.css`: Auth Service shell and centered modal/card auth styling.
- Create `app/login/page.tsx`, `app/register/page.tsx`, `app/forgot-password/page.tsx`, `app/reset-password/page.tsx`, `app/verify-email/page.tsx`: auth UI pages.
- Create `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`, `app/api/auth/logout/route.ts`, `app/api/auth/me/route.ts`, `app/api/auth/forgot-password/route.ts`, `app/api/auth/reset-password/route.ts`, `app/api/auth/verify-email/route.ts`: identity auth APIs.
- Create `app/api/auth/oauth/github/route.ts`, `app/api/auth/oauth/google/route.ts`: OAuth entry/callback routes.
- Create `app/api/oauth/authorize/route.ts`, `app/api/oauth/token/route.ts`: SSO authorize/code exchange APIs.
- Create `lib/db.ts`, `lib/init-schema.ts`: MySQL pool and Auth Service schema.
- Create `lib/auth/session.ts`, `lib/auth/cookies.ts`, `lib/auth/password.ts`, `lib/auth/oauth.ts`, `lib/auth/sso.ts`: focused auth domain helpers.
- Create `lib/email/send.ts`, `lib/url.ts`: email and URL helpers.
- Create `scripts/seed-sso-client.mjs`: seed `mockingbird_website` client without admin UI.
- Create `.env.example`, `.gitignore`, `README.md`.
- Create `tests/unit/auth-routes.test.ts`, `tests/unit/sso-routes.test.ts`.

### Existing Website Repository: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Website`

- Modify `.env.example`: add Auth Service client variables.
- Create `lib/auth/sso-client.ts`: token exchange client.
- Create `lib/auth/sso-state.ts`: state cookie helpers.
- Create `app/api/auth/start/route.ts`: starts SSO redirect.
- Create `app/api/auth/callback/route.ts`: validates state, exchanges code, upserts local user, creates Website session.
- Modify `app/NavAuthButton.tsx`: unauthenticated login button starts SSO.
- Modify `app/AuthModalContext.tsx`: preserve the modal entry experience; replace login/register/forgot-password credential forms with unified-login redirect actions.
- Modify `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/(auth)/forgot-password/page.tsx`: redirect to `/api/auth/start`.
- Keep `app/api/auth/me/route.ts`, `app/api/auth/logout/route.ts`, `lib/auth/session.ts`, membership pages, and role helpers.
- Add or update `tests/unit/sso-client.test.ts`, `tests/unit/sso-callback-route.test.ts`, `tests/unit/auth-start-route.test.ts`.

---

## Task 1: Create Independent Auth Repository

**Files:**
- Create repository directory: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth`
- Create GitHub repo: `lanyijianke/Mockingbird_V2_Auth`

- [ ] **Step 1: Verify the directory does not already exist**

Run:

```bash
test ! -e /Users/grank/Mockingbird_V2/Mockingbird_V2_Auth
```

Expected: exits with code `0`.

- [ ] **Step 2: Create the local project directory and initialize git**

Run:

```bash
mkdir /Users/grank/Mockingbird_V2/Mockingbird_V2_Auth
cd /Users/grank/Mockingbird_V2/Mockingbird_V2_Auth
git init -b main
```

Expected: git initializes an empty repository on `main`.

- [ ] **Step 3: Create the GitHub repository**

Run:

```bash
cd /Users/grank/Mockingbird_V2/Mockingbird_V2_Auth
gh repo create lanyijianke/Mockingbird_V2_Auth --private --source=. --remote=origin
```

Expected: GitHub repo is created and `origin` points to `https://github.com/lanyijianke/Mockingbird_V2_Auth.git`.

- [ ] **Step 4: Verify remote**

Run:

```bash
git remote -v
```

Expected:

```text
origin  https://github.com/lanyijianke/Mockingbird_V2_Auth.git (fetch)
origin  https://github.com/lanyijianke/Mockingbird_V2_Auth.git (push)
```

---

## Task 2: Scaffold Auth Service Baseline

**Files:**
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/package.json`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/tsconfig.json`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/next.config.ts`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/eslint.config.mjs`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/vitest.config.ts`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/next-env.d.ts`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/.gitignore`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/.env.example`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/README.md`

- [ ] **Step 1: Create package manifest**

Write `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/package.json`:

```json
{
  "name": "mockingbird-auth",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 5050",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "seed:sso-client": "node scripts/seed-sso-client.mjs"
  },
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "mysql2": "^3.22.3",
    "nanoid": "^5.1.9",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "resend": "^6.12.2"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "typescript": "^5",
    "vitest": "^4.0.18"
  }
}
```

- [ ] **Step 2: Create TypeScript and Next config**

Use the Website `tsconfig.json` pattern with `@/*` path mapping. Create `next.config.ts`:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;
```

Create `eslint.config.mjs`:

```js
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
];

export default eslintConfig;
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Create environment example**

Write `.env.example`:

```text
MYSQL_URL=mysql://user:password@localhost:3306/mockingbird_auth
SITE_URL=http://localhost:5050
AUTH_COOKIE_NAME=auth_session_token
RESEND_API_KEY=
RESEND_FROM_NAME=Mockingbird Auth
RESEND_FROM_EMAIL=onboarding@resend.dev
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

- [ ] **Step 4: Install dependencies**

Run:

```bash
cd /Users/grank/Mockingbird_V2/Mockingbird_V2_Auth
npm install
```

Expected: `package-lock.json` is created.

- [ ] **Step 5: Commit and push scaffold**

Run:

```bash
git add .
git commit -m "chore: scaffold auth service"
git push -u origin main
```

Expected: first commit appears in the new GitHub repository.

---

## Task 3: Build Auth Service Database And Core Helpers

**Files:**
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/lib/init-schema.ts`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/lib/db.ts`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/lib/auth/session.ts`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/lib/auth/cookies.ts`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/lib/auth/password.ts`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/lib/url.ts`

- [ ] **Step 1: Add schema**

Create `lib/init-schema.ts` with tables:

```ts
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

async function ensureIndex(conn: PoolConnection, indexName: string, sql: string): Promise<void> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND INDEX_NAME = ?`,
    [indexName],
  );
  if (rows.length === 0) await conn.query(sql);
}

export async function initDatabase(conn: PoolConnection): Promise<void> {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS Users (
      Id VARCHAR(36) PRIMARY KEY,
      Name VARCHAR(200) NOT NULL DEFAULT '',
      Email VARCHAR(255) NOT NULL,
      PasswordHash VARCHAR(255) DEFAULT NULL,
      AvatarUrl VARCHAR(1000) DEFAULT NULL,
      EmailVerifiedAt DATETIME DEFAULT NULL,
      CreatedAt DATETIME DEFAULT NOW(),
      UpdatedAt DATETIME DEFAULT NULL,
      UNIQUE INDEX idx_users_email (Email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS Sessions (
      Id INT PRIMARY KEY AUTO_INCREMENT,
      Token VARCHAR(200) NOT NULL,
      UserId VARCHAR(36) NOT NULL,
      ExpiresAt DATETIME NOT NULL,
      CreatedAt DATETIME DEFAULT NOW(),
      UNIQUE INDEX idx_sessions_token (Token),
      INDEX idx_sessions_userId (UserId),
      INDEX idx_sessions_expires (ExpiresAt),
      FOREIGN KEY (UserId) REFERENCES Users(Id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS OauthAccounts (
      Id INT PRIMARY KEY AUTO_INCREMENT,
      Provider VARCHAR(50) NOT NULL,
      ProviderAccountId VARCHAR(255) NOT NULL,
      UserId VARCHAR(36) NOT NULL,
      CreatedAt DATETIME DEFAULT NOW(),
      UNIQUE INDEX idx_oauth_provider (Provider, ProviderAccountId),
      INDEX idx_oauth_userId (UserId),
      FOREIGN KEY (UserId) REFERENCES Users(Id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS EmailVerificationTokens (
      Id INT PRIMARY KEY AUTO_INCREMENT,
      Token VARCHAR(200) NOT NULL,
      UserId VARCHAR(36) NOT NULL,
      ExpiresAt DATETIME NOT NULL,
      CreatedAt DATETIME DEFAULT NOW(),
      UNIQUE INDEX idx_emailverify_token (Token),
      FOREIGN KEY (UserId) REFERENCES Users(Id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS PasswordResetTokens (
      Id INT PRIMARY KEY AUTO_INCREMENT,
      Token VARCHAR(200) NOT NULL,
      UserId VARCHAR(36) NOT NULL,
      ExpiresAt DATETIME NOT NULL,
      CreatedAt DATETIME DEFAULT NOW(),
      UNIQUE INDEX idx_pwdreset_token (Token),
      FOREIGN KEY (UserId) REFERENCES Users(Id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS SsoClients (
      Id VARCHAR(100) PRIMARY KEY,
      Name VARCHAR(200) NOT NULL,
      SecretHash VARCHAR(255) NOT NULL,
      RedirectUrisJson TEXT NOT NULL,
      CreatedAt DATETIME DEFAULT NOW(),
      UpdatedAt DATETIME DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS AuthorizationCodes (
      Id INT PRIMARY KEY AUTO_INCREMENT,
      Code VARCHAR(200) NOT NULL,
      ClientId VARCHAR(100) NOT NULL,
      UserId VARCHAR(36) NOT NULL,
      RedirectUri VARCHAR(1000) NOT NULL,
      ExpiresAt DATETIME NOT NULL,
      ConsumedAt DATETIME DEFAULT NULL,
      CreatedAt DATETIME DEFAULT NOW(),
      UNIQUE INDEX idx_auth_codes_code (Code),
      INDEX idx_auth_codes_client (ClientId),
      INDEX idx_auth_codes_user (UserId),
      FOREIGN KEY (ClientId) REFERENCES SsoClients(Id),
      FOREIGN KEY (UserId) REFERENCES Users(Id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await ensureIndex(conn, 'idx_users_email', 'CREATE INDEX idx_users_email ON Users(Email)');
}
```

- [ ] **Step 2: Add DB helper**

Copy the Website `lib/db.ts` pattern, import `initDatabase`, and keep `query`, `queryOne`, `execute`, `transaction`, and `closePool`.

- [ ] **Step 3: Add cookie/session/password helpers**

Create `lib/auth/cookies.ts`:

```ts
import type { NextRequest } from 'next/server';

export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'auth_session_token';
const SESSION_TTL_SECONDS = 30 * 86400;

export function getSessionToken(request: NextRequest): string | undefined {
  return request.cookies.get(AUTH_COOKIE_NAME)?.value;
}

export function setSessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return [
    `${AUTH_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
    secure,
  ].filter(Boolean).join('; ');
}

export function clearSessionCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return [
    `${AUTH_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    secure,
  ].filter(Boolean).join('; ');
}
```

Create `lib/auth/password.ts`:

```ts
import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

Create `lib/url.ts`:

```ts
export function buildAbsoluteUrl(path: string): string {
  const siteUrl = process.env.SITE_URL || 'http://localhost:5050';
  return new URL(path, siteUrl).toString();
}
```

- [ ] **Step 4: Run type check through build**

Run:

```bash
npm run build
```

Expected: build fails only if missing app files. If so, complete Task 4 before re-running. No TypeScript errors from `lib/*`.

- [ ] **Step 5: Commit**

Run:

```bash
git add lib
git commit -m "feat: add auth service database core"
```

---

## Task 4: Port Auth Service Pages And Identity APIs

**Files:**
- Create Auth pages under `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/app/`
- Create identity API routes under `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/app/api/auth/`
- Create `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/lib/email/send.ts`

- [ ] **Step 1: Add app shell and modal-style auth CSS**

Create `app/layout.tsx`, `app/page.tsx`, and `app/globals.css`. Use a centered card layout derived from the current Website auth modal visual language, with neutral Mockingbird Auth copy instead of Website-specific content surfaces. `app/page.tsx` should redirect to `/login`.

- [ ] **Step 2: Port API behavior from Website**

Port these Website route behaviors into Auth Service with imports adjusted to new helpers:

- `POST /api/auth/register`: creates user, hashes password, creates email verification token, sends verification email, does not create a session.
- `POST /api/auth/login`: validates verified email/password, creates Auth Service session cookie.
- `POST /api/auth/logout`: deletes Auth Service session and clears cookie.
- `GET /api/auth/me`: returns `{ user: null }` when anonymous and basic user profile when logged in.
- `POST /api/auth/forgot-password`: enumeration-safe response, sends reset email when user exists.
- `POST /api/auth/reset-password`: validates reset token, updates password, consumes token.
- `GET /api/auth/verify-email`: validates email token and sets `EmailVerifiedAt`.

- [ ] **Step 3: Port email templates**

Copy Website `lib/email/send.ts`, replace brand config imports with Auth Service constants:

```ts
const BRAND_NAME = process.env.RESEND_FROM_NAME || 'Mockingbird Auth';
```

Use `buildAbsoluteUrl('/verify-email?...')` and `buildAbsoluteUrl('/reset-password?...')` from `lib/url.ts`.

- [ ] **Step 4: Add pages**

Create form pages for `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`. Each page reads and preserves these query params when relevant:

- `client_id`
- `redirect_uri`
- `state`

After successful login, if the query contains SSO params, redirect to `/api/oauth/authorize` with the same params. Otherwise redirect to `/`.

- [ ] **Step 5: Add unit tests**

Create `tests/unit/auth-routes.test.ts` covering register, verified login, unverified login rejection, anonymous `/me`, forgot password unknown email, reset password success.

- [ ] **Step 6: Verify**

Run:

```bash
npm test -- tests/unit/auth-routes.test.ts
npm run lint
npm run build
```

Expected: tests pass; lint and build pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add app lib tests
git commit -m "feat: add identity auth flows"
```

---

## Task 5: Add Auth Service SSO Client And Code Exchange

**Files:**
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/lib/auth/sso.ts`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/app/api/oauth/authorize/route.ts`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/app/api/oauth/token/route.ts`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/scripts/seed-sso-client.mjs`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/tests/unit/sso-routes.test.ts`

- [ ] **Step 1: Add SSO helper functions**

Create functions:

- `getSsoClient(clientId)`
- `verifyClientSecret(rawSecret, secretHash)`
- `isRegisteredRedirectUri(client, redirectUri)`
- `createAuthorizationCode(clientId, userId, redirectUri)`
- `consumeAuthorizationCode(code, clientId, redirectUri)`

Use `nanoid(48)` for codes and a 5-minute expiry.

- [ ] **Step 2: Add authorize route**

`GET /api/oauth/authorize` must:

- require an Auth Service session.
- validate `client_id`, `redirect_uri`, and `state`.
- reject unknown clients or unregistered redirect URIs.
- create an authorization code for the logged-in user.
- redirect to `redirect_uri?code=...&state=...`.

If the user is not logged in, redirect to `/login` with the original SSO query params preserved.

- [ ] **Step 3: Add token route**

`POST /api/oauth/token` must:

- require JSON body.
- require `grant_type === 'authorization_code'`.
- validate client id and secret.
- validate and consume the authorization code.
- return `access_token`, `token_type`, `expires_in`, and basic user profile.

- [ ] **Step 4: Add seed script**

Create `scripts/seed-sso-client.mjs` that accepts:

```bash
npm run seed:sso-client -- --id mockingbird_website --name "Mockingbird Website" --secret "<secret>" --redirect-uri "http://localhost:5046/api/auth/callback"
```

It should hash the secret with bcrypt and upsert `SsoClients.RedirectUrisJson`.

- [ ] **Step 5: Add SSO tests**

Cover:

- unknown client rejected.
- unregistered redirect URI rejected.
- anonymous authorize redirects to login.
- logged-in authorize redirects back with code and state.
- token exchange rejects wrong secret.
- token exchange rejects consumed code.
- token exchange returns user and consumes code.

- [ ] **Step 6: Verify**

Run:

```bash
npm test -- tests/unit/sso-routes.test.ts
npm run lint
npm run build
```

Expected: pass.

- [ ] **Step 7: Commit and push**

Run:

```bash
git add app lib scripts tests
git commit -m "feat: add authorization code sso"
git push
```

---

## Task 6: Prepare Website SSO Client Helpers

**Files:**
- Modify: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Website/.env.example`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Website/lib/auth/sso-client.ts`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Website/lib/auth/sso-state.ts`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Website/tests/unit/sso-client.test.ts`

- [ ] **Step 1: Add Website env variables**

Append:

```text
AUTH_SERVICE_URL=http://localhost:5050
AUTH_CLIENT_ID=mockingbird_website
AUTH_CLIENT_SECRET=
AUTH_CALLBACK_URL=http://localhost:5046/api/auth/callback
AUTH_STATE_COOKIE_NAME=auth_sso_state
```

- [ ] **Step 2: Add token exchange client**

Create `lib/auth/sso-client.ts`:

```ts
export interface SsoUser {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    emailVerified: boolean;
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
```

- [ ] **Step 3: Add state cookie helper**

Create `lib/auth/sso-state.ts` with `createSsoState()`, `setSsoStateCookie(state)`, `clearSsoStateCookie()`, and `getSsoStateFromRequest(request)`. Use `nanoid(32)`, `HttpOnly`, `SameSite=Lax`, and `Max-Age=600`.

- [ ] **Step 4: Add tests**

Mock `fetch` and verify `exchangeSsoCode` posts to the configured Auth Service URL and throws on non-200 responses.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test -- tests/unit/sso-client.test.ts
git add .env.example lib/auth/sso-client.ts lib/auth/sso-state.ts tests/unit/sso-client.test.ts
git commit -m "feat: add website sso client helpers"
```

---

## Task 7: Add Website SSO Start And Callback Routes

**Files:**
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Website/app/api/auth/start/route.ts`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Website/app/api/auth/callback/route.ts`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Website/tests/unit/auth-start-route.test.ts`
- Create: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Website/tests/unit/sso-callback-route.test.ts`

- [ ] **Step 1: Add start route**

`GET /api/auth/start` must:

- read optional `mode` query param: `login`, `register`, or `forgot-password`.
- read optional `callbackUrl`, default `/`.
- create state.
- store state and callback URL in HttpOnly temporary cookie, or store state only and include callback in state payload if signed.
- redirect to Auth Service page path based on mode with `client_id`, `redirect_uri`, and `state`.

- [ ] **Step 2: Add callback route**

`GET /api/auth/callback` must:

- require `code` and `state`.
- compare returned state with cookie state.
- call `exchangeSsoCode(code, AUTH_CALLBACK_URL)`.
- upsert local `Users` row by Auth Service user id:

```sql
INSERT INTO Users (Id, Name, Email, AvatarUrl, Role, EmailVerifiedAt)
VALUES (?, ?, ?, ?, 'user', ?)
ON DUPLICATE KEY UPDATE
  Name = VALUES(Name),
  Email = VALUES(Email),
  AvatarUrl = VALUES(AvatarUrl),
  EmailVerifiedAt = VALUES(EmailVerifiedAt)
```

- create Website session using existing `CreateSession`.
- set existing Website `session_token` cookie.
- clear SSO state cookie.
- redirect to stored callback URL or `/`.

- [ ] **Step 3: Add tests**

Cover missing code/state, mismatched state, failed exchange, successful exchange creating session cookie, and local user upsert.

- [ ] **Step 4: Verify and commit**

Run:

```bash
npm test -- tests/unit/auth-start-route.test.ts tests/unit/sso-callback-route.test.ts
git add app/api/auth/start app/api/auth/callback tests/unit/auth-start-route.test.ts tests/unit/sso-callback-route.test.ts
git commit -m "feat: add website sso callback"
```

---

## Task 8: Redirect Website Login UI To Auth Service

**Files:**
- Modify: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Website/app/NavAuthButton.tsx`
- Modify: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Website/app/AuthModalContext.tsx`
- Modify: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Website/app/(auth)/login/page.tsx`
- Modify: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Website/app/(auth)/register/page.tsx`
- Modify: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Website/app/(auth)/forgot-password/page.tsx`

- [ ] **Step 1: Replace unauthenticated nav click**

Keep unauthenticated `NavAuthButton` opening the existing auth modal:

```ts
openAuth({ mode: 'login' });
```

- [ ] **Step 2: Convert AuthModalContext credential modes into redirect launchers**

Remove embedded login/register/forgot-password credential submission logic, but keep the modal surface. For `login`, `register`, and `forgot-password` modes, render a compact centered panel with the current modal styling and buttons that set:

```ts
window.location.href = `/api/auth/start?mode=${mode}`;
```

Preserve `callbackUrl` when present:

```ts
const params = new URLSearchParams({ mode });
if (callbackUrl) params.set('callbackUrl', callbackUrl);
window.location.href = `/api/auth/start?${params.toString()}`;
```

Keep membership redemption modal behavior unchanged because membership remains Website-local.

- [ ] **Step 3: Replace standalone auth pages with redirects**

Each standalone page should redirect to `/api/auth/start` with the matching mode and any `callbackUrl`. These pages are fallback entry points for direct URLs; the primary Website UI remains the modal launcher.

- [ ] **Step 4: Verify**

Run:

```bash
npm run lint
npm run build
```

Expected: no new lint/build errors from changed files. Existing unrelated lint failures must be documented if still present.

- [ ] **Step 5: Commit**

Run:

```bash
git add app/NavAuthButton.tsx app/AuthModalContext.tsx 'app/(auth)/login/page.tsx' 'app/(auth)/register/page.tsx' 'app/(auth)/forgot-password/page.tsx'
git commit -m "feat: redirect website auth to sso"
```

---

## Task 9: Local End-To-End Verification

**Files:**
- Auth repo env: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/.env.local`
- Website repo env: `/Users/grank/Mockingbird_V2/Mockingbird_V2_Website/.env.local`

- [ ] **Step 1: Configure local env**

Set Auth Service on port `5050` and Website on port `5046`. Use the same MySQL server but separate databases:

```text
mockingbird_auth
mockingbird_knowledge
```

- [ ] **Step 2: Seed Website SSO client**

Run in Auth repo:

```bash
npm run seed:sso-client -- --id mockingbird_website --name "Mockingbird Website" --secret "$AUTH_CLIENT_SECRET" --redirect-uri "http://localhost:5046/api/auth/callback"
```

Expected: `SsoClients` has `mockingbird_website`.

- [ ] **Step 3: Start both dev servers**

Run:

```bash
cd /Users/grank/Mockingbird_V2/Mockingbird_V2_Auth && npm run dev
cd /Users/grank/Mockingbird_V2/Mockingbird_V2_Website && npm run dev
```

Expected: Auth Service at `http://localhost:5050`, Website at `http://localhost:5046`.

- [ ] **Step 4: Verify browser flow**

Open `http://localhost:5046`, click login, register or login through Auth Service, complete callback, and confirm Website nav shows the logged-in user.

- [ ] **Step 5: Verify commands**

Run in Auth repo:

```bash
npm test
npm run lint
npm run build
```

Run in Website repo:

```bash
npm test -- tests/unit/sso-client.test.ts tests/unit/auth-start-route.test.ts tests/unit/sso-callback-route.test.ts
npm run build
```

Expected: pass. If Website `npm run lint` still fails on existing unrelated files, document the exact files and errors.

- [ ] **Step 6: Push Website changes**

Run:

```bash
cd /Users/grank/Mockingbird_V2/Mockingbird_V2_Website
git push origin main
```

Expected: Website SSO client changes are pushed.

---

## Self-Review

- Spec coverage: The plan includes independent Auth project creation, GitHub repository creation, Auth Service identity APIs, authorization-code SSO, Website SSO client integration, and local verification.
- Placeholder scan: No placeholder markers or vague implementation-only-later sections remain.
- Type consistency: `SsoUser`, `ExchangeCodeResult`, state helpers, and code exchange names are consistent across Website tasks.
- Scope check: This plan intentionally stops at MVP SSO. OIDC compliance, global logout, client admin UI, shared entitlements, refresh tokens, and MFA remain out of scope.
