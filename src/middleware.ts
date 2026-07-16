export { auth as middleware } from '@/auth';

export const config = {
  // Everything is members-only except auth routes, static assets, and the
  // public coverage-request pages (outside requesters have no account).
  matcher: [
    '/((?!api/auth|coverage|_next/static|_next/image|favicon.ico).*)',
  ],
};
