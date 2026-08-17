export { auth as middleware } from '@/auth';

export const config = {
  // Everything is members-only except auth routes, static assets, and the
  // public coverage pages under /request-coverage — the request form and the
  // per-request status links, neither of which their requesters have an
  // account for.
  matcher: [
    '/((?!api/auth|request-coverage|_next/static|_next/image|favicon.ico).*)',
  ],
};
