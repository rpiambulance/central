import { NextResponse } from 'next/server';
import { api, ApiError } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * The one door the standby screens write through.
 *
 * The offline queue lives in the browser and has no API token — the session
 * is server-side — so queued writes come back here to be forwarded with the
 * caller's own credentials. Which means it grants nothing they could not
 * already do, and the API enforces every rule regardless.
 *
 * Scoped to the standby namespace all the same. A relay that forwarded any
 * path at all would be a tempting thing to find, and there is no reason for
 * this one to reach further than the screens it exists for.
 */
const ALLOWED = /^\/v1\/standbys(\/|$)/;

export async function POST(request: Request) {
  const { method, path, body } = (await request.json()) as {
    method?: string;
    path?: string;
    body?: unknown;
  };

  if (!path || !ALLOWED.test(path)) {
    return NextResponse.json(
      { message: 'That is not a standby request.' },
      { status: 400 },
    );
  }
  if (!method || !['POST', 'PATCH', 'DELETE'].includes(method)) {
    return NextResponse.json({ message: 'Unsupported method.' }, { status: 400 });
  }

  try {
    const result = await api<unknown>(path, {
      method,
      raw: true,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return NextResponse.json(result ?? {});
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        (error.body as object) ?? { message: 'Request failed' },
        { status: error.status },
      );
    }
    // Something below the API — the relay could not reach it. Reported as a
    // gateway failure so the queue treats it as the network and holds on.
    return NextResponse.json({ message: 'Could not reach the API.' }, { status: 502 });
  }
}
