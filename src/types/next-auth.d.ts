import 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    tokenExpired?: boolean;
    authError?: string;
  }
  interface User {
    // populated by the dev-login credentials provider (local dev only)
    accessToken?: string;
    expiresAt?: number;
  }
}
