import { NextResponse } from 'next/server';

const API_URL = process.env.RAMPART_API_URL ?? 'http://localhost:3001';

export const dynamic = 'force-dynamic';

/**
 * The board, fetched by a display that has been told something changed.
 *
 * Proxied rather than called directly from the television, so the API does
 * not have to be reachable from wherever a screen is plugged in — the same
 * origin that served the page serves its data.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const upstream = await fetch(
    `${API_URL}/v1/headsup/board?token=${encodeURIComponent(token)}`,
    { cache: 'no-store' },
  );
  if (!upstream.ok) {
    return NextResponse.json(
      { error: 'That display link is not in use.' },
      { status: upstream.status },
    );
  }
  return NextResponse.json(await upstream.json(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
