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
    authorized({ auth }) {
      // A session is only useful if it carries a working access token: every
      // page calls the API with it. A stale cookie minted before token
      // handling existed, or one whose refresh failed, looks signed-in but
      // can never call the API — treat it as unauthenticated so the user is
      // sent back through sign-in instead of hitting a server error.
      return !!auth && !!auth.accessToken && !auth.authError;
    },
  },
});

export { devLoginEnabled };
