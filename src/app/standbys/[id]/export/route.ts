import { auth } from '@/auth';

const API_URL = process.env.RAMPART_API_URL ?? 'http://localhost:3001';

export const dynamic = 'force-dynamic';

/**
 * Hands a generated PDF to the browser.
 *
 * The documents are built by the API, which needs the caller's token — and
 * a browser following a link cannot send one. So the link comes here, the
 * session is added on this side, and the PDF is streamed back.
 *
 * The path is checked rather than trusted: it arrives in a query string,
 * which is to say from whatever somebody chose to type.
 */
const ALLOWED = /^\/v1\/standbys\/\d+\/(export\/[a-z0-9-]+\.pdf|encounters\/\d+\/export\.pdf)(\?detail=1)?$/;

export async function GET(request: Request) {
  const to = new URL(request.url).searchParams.get('to') ?? '';
  if (!ALLOWED.test(to)) {
    return new Response('Not a standby export.', { status: 400 });
  }
  const session = await auth();
  const upstream = await fetch(`${API_URL}${to}`, {
    cache: 'no-store',
    headers: session?.accessToken
      ? { Authorization: `Bearer ${session.accessToken}` }
      : {},
  });
  if (!upstream.ok || !upstream.body) {
    return new Response('Could not produce that document.', {
      status: upstream.status === 403 ? 403 : 502,
    });
  }
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition':
        upstream.headers.get('Content-Disposition') ?? 'inline; filename="standby.pdf"',
      'Cache-Control': 'no-store',
    },
  });
}
