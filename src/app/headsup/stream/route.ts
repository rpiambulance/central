const API_URL = process.env.RAMPART_API_URL ?? 'http://localhost:3001';

export const dynamic = 'force-dynamic';
/** Node, not edge: this holds one long-lived connection per screen open. */
export const runtime = 'nodejs';

/**
 * The live channel, passed straight through to the display.
 *
 * The body is piped rather than buffered — the whole point is that a
 * dispatch reaches the screen the moment it lands, and anything that
 * collects the response first would hold it until the stream ended, which
 * is never. `no-transform` stops a proxy helpfully buffering it for us.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const upstream = await fetch(
    `${API_URL}/v1/headsup/stream?token=${encodeURIComponent(token)}`,
    { cache: 'no-store', signal: request.signal },
  );
  if (!upstream.ok || !upstream.body) {
    return new Response('That display link is not in use.', { status: 403 });
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
