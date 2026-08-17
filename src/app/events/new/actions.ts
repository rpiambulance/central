'use server';

import { redirect } from 'next/navigation';
import { nyLocalToIso } from '@/lib/calendar';
import { api, ApiError } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function createEvent(formData: FormData) {
  const positions: Array<{
    position: string;
    count: number;
    requiredCredentialKey?: string;
  }> = [];
  for (let i = 0; i < 5; i++) {
    const position = String(formData.get(`position-${i}`) ?? '').trim();
    if (!position) continue;
    const credential = String(formData.get(`credential-${i}`) ?? '').trim();
    positions.push({
      position: position.toLowerCase(),
      count: Math.max(1, Number(formData.get(`count-${i}`)) || 1),
      ...(credential ? { requiredCredentialKey: credential } : {}),
    });
  }

  const capRaw = String(formData.get('attendeeCap') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();
  const tierId = String(formData.get('tierId') ?? '').trim();

  const body = {
    title: String(formData.get('title') ?? ''),
    ...(description ? { description } : {}),
    ...(location ? { location } : {}),
    startsAt: nyLocalToIso(String(formData.get('startsAt'))),
    endsAt: nyLocalToIso(String(formData.get('endsAt'))),
    kindId: Number(formData.get('kindId')),
    ...(tierId ? { tierId: Number(tierId) } : {}),
    // API semantics: null = unlimited, -1 = closed to plain attendees
    attendeeCap: capRaw === '' ? null : capRaw === '0' ? -1 : Number(capRaw),
    hidden: formData.get('hidden') === 'on',
    positions,
  };

  let eventId: number;
  try {
    const event = await api<{ id: number }>('/v1/events', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    eventId = event.id;
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/events/new?error=${encodeURIComponent(apiErrorMessage(error))}`);
    }
    throw error;
  }
  redirect(`/events/${eventId}`);
}
