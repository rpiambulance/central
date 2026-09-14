import { auth } from '@/auth';

const API_URL = process.env.RAMPART_API_URL ?? 'http://localhost:3001';

export const dynamic = 'force-dynamic';

/**
 * Plays back what the scanner recorded.
 *
 * An <audio> element cannot carry the caller's token, so the element points
 * here and the session is added on this side. Streamed rather than
 * buffered: a dispatch recording is small, but nothing is gained by holding
 * it in this process first.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return new Response('Not a recording.', { status: 400 });
  }
  const session = await auth();
  const upstream = await fetch(`${API_URL}/v1/air/audio/${id}`, {
    cache: 'no-store',
    headers: session?.accessToken
      ? { Authorization: `Bearer ${session.accessToken}` }
      : {},
  });
  if (!upstream.ok || !upstream.body) {
    return new Response('Could not play that recording.', {
      status: upstream.status === 403 ? 403 : 502,
    });
  }
  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'audio/mpeg',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
