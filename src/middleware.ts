export { auth as middleware } from '@/auth';

export const config = {
  // Everything is members-only except auth routes, static assets, and the
  // public coverage pages (outside requesters have no account): the request
  // form at /request-coverage, its old /coverage address, and the status
  // links already sent out at /coverage/status/<token>.
  matcher: [
    '/((?!api/auth|coverage|request-coverage|_next/static|_next/image|favicon.ico).*)',
  ],
};
