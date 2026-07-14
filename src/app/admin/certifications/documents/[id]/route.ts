import { auth } from '@/auth';

const API_URL = process.env.RAMPART_API_URL ?? 'http://localhost:3001';

/**
 * Streams a certification document from the API using the caller's
 * session token, so verifiers can open documents directly in the browser.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return new Response('Not found', { status: 404 });
  }

  const session = await auth();
  if (!session?.accessToken) {
    return new Response('Unauthorized', { status: 401 });
  }

  const res = await fetch(`${API_URL}/v1/certifications/documents/${id}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: 'no-store',
  });

  if (!res.ok || !res.body) {
    return new Response('Unable to load document', { status: res.status });
  }

  return new Response(res.body, {
    headers: {
      'Content-Type':
        res.headers.get('Content-Type') ?? 'application/octet-stream',
      'Content-Disposition': res.headers.get('Content-Disposition') ?? 'inline',
    },
  });
}
