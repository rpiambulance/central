import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * Auth, plus the path of the page being requested.
 *
 * A server component cannot see its own URL, so the path is passed down as a
 * header for the access log to report. Set on the *request* headers, which
 * are what `headers()` returns, rather than on the response.
 */
export default auth((request) => {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  // Everything is members-only except auth routes, static assets, and the
  // public coverage pages under /request-coverage — the request form and the
  // per-request status links, neither of which their requesters have an
  // account for.
  matcher: [
    '/((?!api/auth|request-coverage|_next/static|_next/image|favicon.ico).*)',
  ],
};
