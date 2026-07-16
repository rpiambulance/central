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
const devLoginEnabled = process.env.AUTH_DEV_LOGIN === 'true';

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
    jwt({ token, account, user }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.expiresAt = account.expires_at;
      } else if (user && 'accessToken' in user) {
        // dev-login provider: token came from the password grant
        token.accessToken = (user as { accessToken: string }).accessToken;
        token.expiresAt = (user as { expiresAt: number }).expiresAt;
      }
      return token;
    },
    session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.tokenExpired =
        typeof token.expiresAt === 'number' &&
        Date.now() / 1000 > token.expiresAt;
      return session;
    },
    authorized({ auth }) {
      return !!auth;
    },
  },
});

export { devLoginEnabled };
