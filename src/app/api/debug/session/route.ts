import { auth } from '@/auth';

/**
 * Reports the *shape* of the caller's session for debugging auth problems.
 * Never returns the token itself — only whether one is present, its length,
 * and expiry state. Requires a session.
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json(
      {
        hasSession: false,
        hint: 'No session cookie was accepted. Either you are signed out, or AUTH_SECRET changed since the cookie was issued (every redeploy with a new secret invalidates existing sessions).',
      },
      { status: 200 },
    );
  }

  const token = session.accessToken;
  return Response.json({
    hasSession: true,
    user: { name: session.user?.name ?? null, email: session.user?.email ?? null },
    hasAccessToken: !!token,
    accessTokenLength: token?.length ?? 0,
    tokenExpired: session.tokenExpired ?? null,
    authError: session.authError ?? null,
    apiBaseUrl: process.env.RAMPART_API_URL ?? '(unset)',
    keycloakIssuer: process.env.AUTH_KEYCLOAK_ISSUER ?? '(unset)',
    hint: token
      ? 'Session carries an access token. If the API still returns 401, compare keycloakIssuer above with the API KEYCLOAK_ISSUER.'
      : 'Session has NO access token. Usual causes: (1) a stale cookie from before token handling existed — clear cookies and sign in again; (2) the Keycloak client is a public client, so Auth.js never receives an access token — set Client authentication: On and configure AUTH_KEYCLOAK_SECRET.',
  });
}
