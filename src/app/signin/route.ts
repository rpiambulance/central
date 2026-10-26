import { redirect } from 'next/navigation';
import { auth, devLoginEnabled, signIn } from '@/auth';

/** Only somewhere inside this app, so a crafted link cannot bounce elsewhere. */
function safeCallback(raw: string | null): string {
  if (!raw) return '/';
  try {
    const url = new URL(raw, 'http://placeholder');
    return `${url.pathname}${url.search}`;
  } catch {
    return '/';
  }
}

/**
 * Sign-in, with nothing to press.
 *
 * There is one identity provider, so a page asking which one to use is a
 * click that has only ever had one answer. Anyone who needs to sign in is
 * sent straight to Keycloak and comes back where they were going.
 *
 * Except with the dev login on, where the point is not to be redirected to
 * Keycloak at all: that goes to the dashboard, which carries the username
 * and password form. Local only — the production image cannot enable it.
 */
export async function GET(request: Request) {
  const callbackUrl = safeCallback(
    new URL(request.url).searchParams.get('callbackUrl'),
  );

  // Already signed in and somehow back here: nothing to do but go on.
  const session = await auth();
  if (session?.accessToken && !session.authError) redirect(callbackUrl);

  if (devLoginEnabled) redirect('/');
  await signIn('keycloak', { redirectTo: callbackUrl });
}
