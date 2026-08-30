import { auth } from '@/auth';

const API_URL = process.env.RAMPART_API_URL ?? 'http://localhost:3001';

/**
 * Streams an evaluation's attachment, carrying the caller's session.
 *
 * The same shape as the certification document route, and for the same
 * reasons: the API decides who may see it — on the evaluation's own rules —
 * and this only carries the token so the file opens rather than downloading
 * blind from an address the browser never learns.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Attachment ids are UUIDs. Checking the shape keeps anything else from
  // reaching the API as a path segment.
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return new Response('Not found', { status: 404 });
  }

  const session = await auth();
  if (!session?.accessToken) {
    return new Response('Unauthorized', { status: 401 });
  }

  const res = await fetch(`${API_URL}/v1/evals/attachments/${id}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: 'no-store',
  });

  if (!res.ok || !res.body) {
    return new Response('Unable to load attachment', { status: res.status });
  }

  return new Response(res.body, {
    headers: {
      'Content-Type':
        res.headers.get('Content-Type') ?? 'application/octet-stream',
      'Content-Disposition': res.headers.get('Content-Disposition') ?? 'inline',
      'Cache-Control': 'private, no-store',
    },
  });
}
