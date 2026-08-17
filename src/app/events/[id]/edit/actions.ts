'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

/** Reads the five position rows shared by the create and edit forms. */
function readPositions(formData: FormData) {
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
      position,
      count: Math.max(1, Number(formData.get(`count-${i}`)) || 1),
      ...(credential ? { requiredCredentialKey: credential } : {}),
    });
  }
  return positions;
}

export async function updateEvent(eventId: number, formData: FormData) {
  const capRaw = String(formData.get('attendeeCap') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();
  const tierId = String(formData.get('tierId') ?? '').trim();

  const body = {
    title: String(formData.get('title') ?? ''),
    description,
    location,
    startsAt: new Date(String(formData.get('startsAt'))).toISOString(),
    endsAt: new Date(String(formData.get('endsAt'))).toISOString(),
    kindId: Number(formData.get('kindId')),
    tierId: tierId ? Number(tierId) : null,
    // API semantics: null = unlimited, -1 = closed to plain attendees
    attendeeCap: capRaw === '' ? null : capRaw === '0' ? -1 : Number(capRaw),
    hidden: formData.get('hidden') === 'on',
    positions: readPositions(formData),
  };

  try {
    await api(`/v1/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(
        `/events/${eventId}/edit?error=${encodeURIComponent(apiErrorMessage(error))}`,
      );
    }
    throw error;
  }
  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}`);
}

export async function deleteEvent(eventId: number) {
  try {
    await api(`/v1/events/${eventId}`, { method: 'DELETE' });
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(
        `/events/${eventId}/edit?error=${encodeURIComponent(apiErrorMessage(error))}`,
      );
    }
    throw error;
  }
  revalidatePath('/events');
  redirect('/events');
}
