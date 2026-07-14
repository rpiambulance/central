export { auth as middleware } from '@/auth';

export const config = {
  // Everything is members-only except auth routes and static assets.
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
