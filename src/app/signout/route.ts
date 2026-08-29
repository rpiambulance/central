import { signOut } from '@/auth';

/**
 * Signing out, as a plain form POST.
 *
 * Deliberately not a server action: an action's redirect only takes effect
 * when it is invoked through a form or a transition, and inside a dropdown
 * that is easy to get wrong and hard to notice. A native form posting to a
 * route handler has none of that machinery — it works with or without
 * JavaScript, and cannot fail differently depending on where it is rendered.
 */
export async function POST(): Promise<Response> {
  await signOut({ redirect: false });
  // Back to this site's own front page, by a relative Location header. The
  // previous absolute URL was built from NEXTAUTH_URL, which nothing sets —
  // Auth.js v5 reads AUTH_URL — so every sign-out in production fell through
  // to the hard-coded localhost default and sent members to a dead address.
  //
  // Relative rather than rebuilt from AUTH_URL: a redirect to where you
  // already are needs no configuration to be right, and cannot rot again the
  // next time a variable is renamed. RFC 7231 §7.1.2 allows it, and every
  // browser resolves it against the request URL.
  return new Response(null, { status: 303, headers: { Location: '/' } });
}
