import NextAuth from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';

/**
 * Keycloak is authN only — all authorization lives in the Rampart API's
 * roles/permissions model. We keep the Keycloak access token in the JWT so
 * server components can call the API on the member's behalf.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Keycloak],
  callbacks: {
    jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.expiresAt = account.expires_at;
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
