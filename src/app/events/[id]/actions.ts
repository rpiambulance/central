'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function signupForEvent(eventId: number, position: string | null) {
  try {
    await api(`/v1/events/${eventId}/signup`, {
      method: 'POST',
      body: JSON.stringify({ position }),
    });
  } catch (error) {
    redirect(
      `/events/${eventId}?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath(`/events/${eventId}`);
}

export async function dropFromEvent(eventId: number) {
  try {
    await api(`/v1/events/${eventId}/signup`, { method: 'DELETE' });
  } catch (error) {
    redirect(
      `/events/${eventId}?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath(`/events/${eventId}`);
}
