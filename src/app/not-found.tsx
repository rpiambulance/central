import { redirect } from 'next/navigation';

/**
 * A signed-in member who lands on a URL that does not exist goes back to
 * their dashboard rather than a dead end. Unauthenticated visitors never get
 * here: middleware sends them to sign in first.
 */
export default function NotFound() {
  redirect('/?missing=1');
}
