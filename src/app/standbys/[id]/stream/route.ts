import { auth } from '@/auth';

const API_URL = process.env.RAMPART_API_URL ?? 'http://localhost:3001';

export const dynamic = 'force-dynamic';
/** Node, not edge: this holds one long-lived connection per board open. */
export const runtime = 'nodejs';

/**
 * The live channel for one standby, passed straight through.
 *
 * EventSource cannot carry a bearer token, so the board points here and the
 * session is added on this side — the same arrangement the display in the
 * bay uses. The body is piped rather than buffered: anything that collected
 * the response first would hold it until the stream ended, which is never.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return new Response('Not a standby.', { status: 400 });

  const session = await auth();
  const upstream = await fetch(`${API_URL}/v1/standbys/${id}/stream`, {
    cache: 'no-store',
    signal: request.signal,
    headers: session?.accessToken
      ? { Authorization: `Bearer ${session.accessToken}` }
      : {},
  });
  if (!upstream.ok || !upstream.body) {
    return new Response('That standby is not yours to watch.', {
      status: upstream.status === 403 ? 403 : 502,
    });
  }
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
