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
  return Response.redirect(new URL('/', process.env.NEXTAUTH_URL ?? 'http://localhost:3000'), 303);
}
