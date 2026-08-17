import { redirect } from 'next/navigation';

/**
 * The request form moved to /request-coverage, which says what it is. Anyone
 * holding the old address — a bookmark, a printed flyer, an email from last
 * season — still lands in the right place.
 */
export default function CoverageRedirect() {
  redirect('/request-coverage');
}
