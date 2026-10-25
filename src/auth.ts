import NextAuth from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';
import Credentials from 'next-auth/providers/credentials';

/**
 * Keycloak is authN only — all authorization lives in the Rampart API's
 * roles/permissions model. We keep the Keycloak access token in the JWT so
 * server components can call the API on the member's behalf.
 *
 * AUTH_DEV_LOGIN=true additionally enables a username/password form that
 * exchanges credentials for a real Keycloak token server-side (direct-access
 * grant) — no browser redirect to Keycloak, no /etc/hosts entry. Local
 * development only; never enable in production.
 */
// Never available in a production image, even if the env var leaks in:
// the runtime Docker stage sets NODE_ENV=production.
const devLoginEnabled =
  process.env.AUTH_DEV_LOGIN === 'true' &&
  process.env.NODE_ENV !== 'production';

const providers = [
  Keycloak,
  ...(devLoginEnabled
    ? [
        Credentials({
          id: 'dev-login',
          name: 'Dev login',
          credentials: {
            username: { label: 'Username' },
            password: { label: 'Password', type: 'password' },
          },
          async authorize(credentials) {
            const issuer = process.env.AUTH_KEYCLOAK_ISSUER!;
            const res = await fetch(
              `${issuer}/protocol/openid-connect/token`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  grant_type: 'password',
                  client_id: process.env.AUTH_KEYCLOAK_ID!,
                  client_secret: process.env.AUTH_KEYCLOAK_SECRET!,
                  username: String(credentials?.username ?? ''),
                  password: String(credentials?.password ?? ''),
                }),
              },
            );
            if (!res.ok) return null;
            const data = (await res.json()) as {
              access_token: string;
              expires_in: number;
            };
            return {
              id: String(credentials?.username),
              name: String(credentials?.username),
              accessToken: data.access_token,
              expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
            };
          },
        }),
      ]
    : []),
];

/**
 * Pages that must render without a session.
 *
 * Exact matches, deliberately: `/headsup` is a public display, but
 * `/headsup/notes` is a member writing on it and `/headsup/links` is an
 * officer handing out the display links. A prefix test here would quietly
 * open both.
 */
const PUBLIC_PATHS = new Set(['/headsup', '/headsup/stream', '/headsup/data']);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

/**
 * Whether this request has to go back through sign-in.
 *
 * Only for a session that exists and is no good: one whose refresh failed
 * because the member has been away long enough for Keycloak to forget them,
 * or a cookie minted before token handling existed. It looks signed-in, and
 * every page calls the API with it, so it reaches a page and dies there.
 *
 * No session at all is left alone. A page with nothing to show a stranger
 * says so itself — the dashboard offers sign-in, including the dev login —
 * and bouncing to Keycloak before it renders would take that away.
 *
 * Exported because the middleware has to apply this itself. The authorized()
 * callback below returns the same answer, but next-auth only acts on it when
 * no middleware function of our own was given — and we give one, to stamp
 * the path for the access log. Both read this so they cannot drift.
 */
export function needsSignIn(
  pathname: string,
  session: { accessToken?: string; authError?: string } | null,
): boolean {
  if (isPublicPath(pathname) || !session) return false;
  return !session.accessToken || !!session.authError;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  callbacks: {
    async jwt({ token, account, user }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        delete token.authError;
        return token;
      }
      if (user && 'accessToken' in user) {
        // dev-login provider: token came from the password grant
        token.accessToken = (user as { accessToken: string }).accessToken;
        token.expiresAt = (user as { expiresAt: number }).expiresAt;
        return token;
      }

      // Still valid (30s of slack)? Keep it.
      if (
        typeof token.expiresAt === 'number' &&
        Date.now() / 1000 < token.expiresAt - 30
      ) {
        return token;
      }

      // Expired. Keycloak access tokens default to 5 minutes, so without this
      // every session would break minutes after sign-in.
      if (typeof token.refreshToken !== 'string') {
        token.authError = 'NoRefreshToken';
        return token;
      }
      try {
        const res = await fetch(
          `${process.env.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/token`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              client_id: process.env.AUTH_KEYCLOAK_ID!,
              client_secret: process.env.AUTH_KEYCLOAK_SECRET!,
              refresh_token: token.refreshToken,
            }),
          },
        );
        if (!res.ok) throw new Error(`refresh failed: ${res.status}`);
        const refreshed = (await res.json()) as {
          access_token: string;
          expires_in: number;
          refresh_token?: string;
        };
        token.accessToken = refreshed.access_token;
        token.expiresAt = Math.floor(Date.now() / 1000) + refreshed.expires_in;
        if (refreshed.refresh_token) token.refreshToken = refreshed.refresh_token;
        delete token.authError;
      } catch {
        // Force re-authentication rather than silently sending a dead token.
        token.authError = 'RefreshFailed';
      }
      return token;
    },
    session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.tokenExpired =
        typeof token.expiresAt === 'number' &&
        Date.now() / 1000 > token.expiresAt;
      session.authError = token.authError as string | undefined;
      return session;
    },
    authorized({ auth, request }) {
      // The whiteboard displays carry a token in the URL instead of a
      // session: a television in the bay cannot sign in, and nobody wants it
      // to. The API is what checks that token — this only decides that a
      // missing cookie is not by itself a reason to turn the screen away.
      //
      // next-auth ignores this answer whenever a middleware function of our
      // own is given, which it is, so the middleware applies needsSignIn
      // directly. This stays correct rather than becoming a second opinion.
      return !needsSignIn(request.nextUrl.pathname, auth);
    },
  },
});

export { devLoginEnabled };
