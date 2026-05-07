# Auth Service SSO Design

## Goal

Split the current Website login, registration, email verification, OAuth login, and password reset flows into an independent Auth Service so future Mockingbird sub-sites on different primary domains can use one unified login system.

## Current Context

Authentication is currently implemented inside `Mockingbird_V2_Website` across several areas:

- `app/(auth)/` renders login, register, forgot password, reset password, and verify email pages.
- `app/AuthModalContext.tsx` renders modal versions of login, register, forgot password, and membership redemption.
- `app/api/auth/` owns login, register, logout, me, OAuth, email verification, and password reset route handlers.
- `lib/auth/` owns sessions, roles, and role guards.
- `lib/init-schema.ts` creates user, session, OAuth, email verification, password reset, membership, and invitation tables.
- `middleware.ts`, `NavAuthButton`, profile, and membership features consume the local session cookie and local user data.

The current implementation is a normal single-site auth system. It cannot become cross-domain unified login by only sharing cookies because future sub-sites will not all live under the same primary domain.

## Chosen Approach

Create a new independent project:

```text
/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth/
```

`Mockingbird_V2_Auth` will be a standalone Next.js Auth Service. It will own the unified identity system and expose an authorization-code based SSO flow to sub-sites.

This project must also have its own GitHub repository. The current `Mockingbird_V2_Website` repository will keep only the design and integration work for the Website client. The new Auth Service code should not be committed into the Website repository.

Recommended repository:

```text
https://github.com/lanyijianke/Mockingbird_V2_Auth
```

If the repository does not exist yet, the implementation should create it before the first Auth Service commit, then push the scaffolded project to `origin/main`.

Sub-sites will not share the Auth Service cookie. Instead, each sub-site will redirect users to the Auth Service, receive a short-lived authorization code, exchange that code server-side for user information, and then create its own local session cookie.

This keeps the design compatible with unrelated domains and avoids leaking tokens through URLs or browser history.

## Alternatives Considered

### Shared Auth Cookie

This would make `auth.example.com`, `www.example.com`, and `ai.example.com` share one cookie. It is simple for same-site subdomains, but it does not work for unrelated primary domains. The user confirmed future sub-sites will not all share one primary domain, so this approach is rejected.

### JWT Directly In Callback URL

The Auth Service could redirect back with a signed JWT in the URL. This is fast to build but unsafe because URLs are commonly stored in browser history, logs, analytics, proxies, and referrers. This approach is rejected.

### Reverse Proxy Auth APIs From Every Sub-Site

Every sub-site could proxy `/api/auth/*` to a shared backend. This creates complicated cookie, CSRF, callback, and logout behavior across domains. It also keeps too much auth implementation detail inside every sub-site. This approach is rejected.

## SSO Flow

### Login Start

A sub-site sends the user to the Auth Service:

```text
https://auth.example.com/login
  ?client_id=mockingbird_website
  &redirect_uri=https%3A%2F%2Fsubsite.example%2Fapi%2Fauth%2Fcallback
  &state=<opaque-csrf-state>
```

The sub-site stores `state` in an HttpOnly temporary cookie before redirecting.

### Auth Service Login

The Auth Service authenticates the user using email/password, GitHub OAuth, or Google OAuth. After successful login it creates a one-time authorization code linked to:

- user id
- client id
- redirect URI
- expiry timestamp
- consumed timestamp

The code must expire quickly, with 5 minutes as the MVP default.

### Callback

The Auth Service redirects back to the registered sub-site callback:

```text
https://subsite.example/api/auth/callback?code=<authorization-code>&state=<state>
```

The sub-site verifies `state` against its temporary cookie.

### Code Exchange

The sub-site backend exchanges the code server-to-server:

```text
POST https://auth.example.com/api/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "client_id": "mockingbird_website",
  "client_secret": "<server-only-secret>",
  "code": "<authorization-code>",
  "redirect_uri": "https://subsite.example/api/auth/callback"
}
```

The Auth Service validates:

- `client_id` exists.
- `client_secret` matches.
- `redirect_uri` is registered for the client.
- code exists.
- code belongs to the same client and redirect URI.
- code is not expired.
- code has not been consumed.

The Auth Service marks the code consumed before returning success.

### Token Response

MVP response:

```json
{
  "access_token": "short-lived-token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User",
    "avatarUrl": null,
    "emailVerified": true
  }
}
```

For MVP, sub-sites should use the returned `user` to create their own session. The `access_token` exists for future API use and can initially be a short-lived opaque token or signed JWT. Sub-sites must not store it in client-side JavaScript.

## Auth Service Responsibilities

`Mockingbird_V2_Auth` owns:

- login page
- register page
- forgot password page
- reset password page
- verify email page
- GitHub OAuth entry and callback
- Google OAuth entry and callback
- Auth Service session cookie
- unified user database
- password hashing
- email verification tokens
- password reset tokens
- OAuth account bindings
- SSO client registry
- authorization code issuance
- authorization code exchange

## Website Responsibilities After Migration

`Mockingbird_V2_Website` becomes an SSO client. It keeps:

- local session cookie for Website.
- route protection in `middleware.ts`.
- `GET /api/auth/me` for Website UI.
- `POST /api/auth/logout` for Website local logout.
- profile page.
- membership redemption.
- invitation code tables.
- Website-specific roles and membership expiry for MVP.

It changes:

- login/register/forgot-password links redirect to Auth Service.
- `app/AuthModalContext.tsx` login/register/forgot-password forms are removed or replaced with redirect helpers.
- new `app/api/auth/callback/route.ts` handles code exchange.
- new `lib/auth/sso-client.ts` calls the Auth Service token endpoint.
- local user records are upserted from Auth Service user data.

## Data Ownership

### Move To Auth Service

- `Users` identity fields:
  - `Id`
  - `Name`
  - `Email`
  - `PasswordHash`
  - `AvatarUrl`
  - `EmailVerifiedAt`
  - `CreatedAt`
  - `UpdatedAt`
- `Sessions`
- `OauthAccounts`
- `EmailVerificationTokens`
- `PasswordResetTokens`

### Keep In Website For MVP

- `InvitationCodes`
- `InvitationRedemptions`
- Website membership role
- `MembershipExpiresAt`
- Website role checks

The Website can keep a local `Users` table as a user mirror keyed by the Auth Service user id. For MVP, membership role data remains in Website so the SSO split does not force all sub-sites to adopt the same entitlement model immediately.

If future sub-sites need shared membership entitlements, that should become a separate entitlement service or a second Auth Service capability after SSO is stable.

## Auth Service Database Additions

The Auth Service needs a client registry:

```sql
CREATE TABLE SsoClients (
    Id VARCHAR(100) PRIMARY KEY,
    Name VARCHAR(200) NOT NULL,
    SecretHash VARCHAR(255) NOT NULL,
    RedirectUrisJson TEXT NOT NULL,
    CreatedAt DATETIME DEFAULT NOW(),
    UpdatedAt DATETIME DEFAULT NULL
);
```

The Auth Service needs authorization codes:

```sql
CREATE TABLE AuthorizationCodes (
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
);
```

## Environment Variables

### Auth Service

```text
MYSQL_URL=
SITE_URL=
AUTH_COOKIE_NAME=auth_session_token
RESEND_API_KEY=
EMAIL_FROM=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Website

```text
AUTH_SERVICE_URL=
AUTH_CLIENT_ID=mockingbird_website
AUTH_CLIENT_SECRET=
AUTH_CALLBACK_URL=http://localhost:5046/api/auth/callback
AUTH_STATE_COOKIE_NAME=auth_sso_state
```

## UI Scope

The Auth Service should reuse the existing Website auth page styles as the starting point, but it should become visually neutral enough to serve all sub-sites.

MVP does not require building a full client management admin UI. Initial SSO clients can be seeded by script or environment-driven setup.

## Security Requirements

- Only registered redirect URIs are allowed.
- Authorization codes are single-use.
- Authorization codes expire after 5 minutes.
- Sub-sites must exchange codes server-side.
- `client_secret` is never exposed to browser code.
- Auth Service login cookies are HttpOnly.
- Sub-site session cookies are HttpOnly.
- Callback `state` is required and stored in an HttpOnly temporary cookie by the sub-site.
- Token/code exchange failures return generic errors to users and detailed logs server-side.
- Password reset and email verification tokens remain single-purpose and time-limited.

## Migration Plan

### Phase 0: Create Independent Auth Project And Repository

Create the local project directory at `/Users/grank/Mockingbird_V2/Mockingbird_V2_Auth`. Initialize it as its own git repository. Create the matching GitHub repository under the same owner as the Website repository, then connect it as `origin`.

The Auth Service implementation must be committed and pushed in that new repository. The Website repository should receive only Website-side SSO client changes and documentation.

### Phase 1: Prepare Website Auth Boundaries

Refactor Website auth route logic into service functions without changing behavior. This makes the logic easier to move and reduces the risk of copying route-specific code into the new Auth Service.

### Phase 2: Create Auth Service

Create `Mockingbird_V2_Auth` as a new Next.js project. Move identity auth pages, auth APIs, email sending, session logic, and identity schema there. Add SSO client and authorization code support.

### Phase 3: Convert Website To SSO Client

Add Website SSO callback, SSO client helper, state cookie handling, and local user upsert. Change login/register/forgot-password entry points to redirect to Auth Service. Keep Website membership logic local.

### Phase 4: Decommission Duplicate Website Auth

After Website login works through the Auth Service, remove or disable the old local register/login/reset/verify/OAuth endpoints from Website. Keep `/api/auth/me`, `/api/auth/logout`, and `/api/auth/callback`.

## Testing Strategy

### Auth Service

- Register creates user and verification token.
- Login rejects unverified email.
- Login creates Auth Service session for verified user.
- Forgot password returns enumeration-safe success for unknown email.
- Reset password consumes valid reset token.
- OAuth login links or creates users.
- Authorize rejects unregistered clients and redirect URIs.
- Token exchange rejects wrong secret, expired code, consumed code, and redirect URI mismatch.
- Token exchange consumes the code and returns user data.

### Website

- Login start redirects to Auth Service with `client_id`, `redirect_uri`, and `state`.
- Callback rejects missing or mismatched `state`.
- Callback exchanges code using server-only credentials.
- Callback upserts local user mirror.
- Callback creates Website session cookie.
- `/api/auth/me` returns the local Website user.
- Logout clears only the Website local session.
- Membership redemption still works for SSO-created local users.

## Non-Goals For MVP

- Full OpenID Connect compliance.
- Client self-service admin UI.
- Shared cross-domain cookie.
- Single global logout across every sub-site.
- Centralized membership entitlement service.
- Refresh token rotation.
- Device management.
- Multi-factor authentication.

## Open Decisions Resolved

- Future sub-sites may use different primary domains, so shared cookies are not used.
- Sub-sites can add their own backend callback endpoints, so authorization code exchange is feasible.
- The first implementation should optimize for a small working SSO system rather than a complete OAuth/OIDC platform.
