import { headers } from 'next/headers';
import { api } from './api';

/**
 * Reports the page being rendered to the API's access log.
 *
 * The API sees the calls a page makes but never the page itself, and the two
 * are not the same question — "who opened the member directory" is not
 * answerable from a list of endpoint hits. Called once from the navigation
 * shell, which every signed-in page renders through.
 *
 * Fire-and-forget, and swallowed on failure: a page must not fail to render,
 * or wait, because its visit could not be recorded.
 */
export async function recordPageView(): Promise<void> {
  try {
    const incoming = await headers();
    // Set by middleware; without it there is no path worth recording.
    const path = incoming.get('x-pathname');
    if (!path) return;

    void api('/v1/access-log/page-view', {
      method: 'POST',
      raw: true,
      body: JSON.stringify({ path }),
      headers: {
        // The browser's address, not this server's — otherwise every page
        // view in the log comes from the portal itself.
        ...(incoming.get('x-forwarded-for')
          ? { 'x-forwarded-for': incoming.get('x-forwarded-for')! }
          : {}),
        ...(incoming.get('user-agent')
          ? { 'user-agent': incoming.get('user-agent')! }
          : {}),
      },
    }).catch(() => {});
  } catch {
    // No headers available, or no session. Not worth failing a page over.
  }
}
