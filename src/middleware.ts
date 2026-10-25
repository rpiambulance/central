import { NextResponse } from 'next/server';
import { auth, needsSignIn } from '@/auth';

/**
 * Auth, plus the path of the page being requested.
 *
 * A server component cannot see its own URL, so the path is passed down as a
 * header for the access log to report. Set on the *request* headers, which
 * are what `headers()` returns, rather than on the response.
 *
 * The sign-in check is made here rather than left to the authorized()
 * callback. next-auth only acts on that callback when no middleware function
 * was supplied — supplying one, as we do for the path header, takes the
 * other branch and throws the answer away. So a member who had been away
 * long enough for their session to die walked straight through to a page,
 * which called the API with a dead token and died on the 401.
 */
export default auth((request) => {
  if (needsSignIn(request.nextUrl.pathname, request.auth)) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = '/api/auth/signin';
    // Back to where they were going once they are let in. The matcher
    // excludes /api/auth, so this cannot bounce off itself.
    signIn.search = `?callbackUrl=${encodeURIComponent(request.nextUrl.href)}`;
    return NextResponse.redirect(signIn);
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  // Everything is members-only except auth routes, static assets, and the
  // two public request paths: /request-coverage — the form and the
  // per-request status links, neither of which their requesters have an
  // account for — and /request-account, which is how somebody without an
  // account asks for one and so cannot require having one.
  //
  // The whiteboard displays are deliberately NOT excluded here. They are
  // public, but they are let through by the authorized() callback in auth.ts
  // instead, so this middleware still runs and still stamps the path — which
  // is how the layout knows to give a television the page with no sidebar
  // wrapped around it.
  matcher: [
    '/((?!api/auth|request-coverage|request-account|_next/static|_next/image|favicon.ico).*)',
  ],
};
