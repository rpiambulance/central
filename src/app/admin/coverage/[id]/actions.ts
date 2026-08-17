'use server';

import { revalidatePath } from 'next/cache';
import { nyLocalToIso } from '@/lib/calendar';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function messageRequester(requestId: number, formData: FormData) {
  const body = String(formData.get('body') ?? '').trim();
  try {
    await api(`/v1/coverage-requests/${requestId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  } catch (error) {
    redirect(
      `/admin/coverage/${requestId}?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath(`/admin/coverage/${requestId}`);
}

const POSITION_ROWS = 5;

export async function draftEvent(requestId: number, formData: FormData) {
  const str = (name: string) => String(formData.get(name) ?? '').trim();

  const positions: Array<{
    position: string;
    count: number;
    requiredCredentialKey?: string | null;
  }> = [];
  for (let i = 0; i < POSITION_ROWS; i += 1) {
    const position = str(`position-${i}`);
    if (!position) continue;
    const count = Number(str(`count-${i}`) || '1');
    const credential = str(`credential-${i}`);
    positions.push({
      position,
      count: Number.isInteger(count) && count > 0 ? count : 1,
      requiredCredentialKey: credential || null,
    });
  }

  // Read as New York wall time; the server's own clock is UTC.
  const toIso = (value: string) => (value ? nyLocalToIso(value) : value);

  let eventId: number;
  try {
    const event = await api<{ id: number }>(
      `/v1/coverage-requests/${requestId}/event`,
      {
        method: 'POST',
        body: JSON.stringify({
          title: str('title'),
          kindId: Number(str('kindId')),
          tierId: str('tierId') ? Number(str('tierId')) : null,
          startsAt: toIso(str('startsAt')),
          endsAt: toIso(str('endsAt')),
          location: str('location') || undefined,
          positions,
        }),
      },
    );
    eventId = event.id;
  } catch (error) {
    redirect(
      `/admin/coverage/${requestId}?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath(`/admin/coverage/${requestId}`);
  redirect(`/events/${eventId}`);
}

export async function declineRequest(requestId: number, formData: FormData) {
  const reason = String(formData.get('reason') ?? '').trim();
  try {
    await api(`/v1/coverage-requests/${requestId}/decline`, {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {}),
    });
  } catch (error) {
    redirect(
      `/admin/coverage/${requestId}?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/admin/coverage');
  // Nothing further to do with a declined request, so go back to the list.
  redirect('/admin/coverage?declined=1');
}
