import { NextResponse } from 'next/server';
import { api } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Where a run number can be drawn from, for the issue button. */
export async function GET() {
  const locations = await api<Array<{ id: number; name: string; active: boolean }>>(
    '/v1/run-numbers/locations',
    { raw: true },
  ).catch(() => []);
  return NextResponse.json(
    locations.filter((l) => l.active).map((l) => ({ id: l.id, name: l.name })),
  );
}
