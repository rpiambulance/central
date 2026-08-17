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

export async function advanceWorkflow(
  eventId: number,
  action: string,
  formData: FormData,
) {
  const notes = String(formData.get('notes') ?? '').trim();
  try {
    await api(`/v1/events/${eventId}/workflow`, {
      method: 'POST',
      body: JSON.stringify({ action, ...(notes ? { notes } : {}) }),
    });
  } catch (error) {
    redirect(
      `/events/${eventId}?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath(`/events/${eventId}`);
}

export async function respondAvailability(eventId: number, formData: FormData) {
  const positions = formData.getAll('positions').map(String);
  const note = String(formData.get('note') ?? '').trim();
  try {
    await api(`/v1/events/${eventId}/availability`, {
      method: 'POST',
      body: JSON.stringify({ positions, ...(note ? { note } : {}) }),
    });
  } catch (error) {
    redirect(
      `/events/${eventId}?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath(`/events/${eventId}`);
}

export async function signupOther(
  eventId: number,
  memberId: number,
  position: string,
) {
  try {
    await api(`/v1/events/${eventId}/signup/${memberId}`, {
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

export async function assignMember(eventId: number, formData: FormData) {
  const memberId = Number(formData.get('memberId'));
  const position = String(formData.get('position') ?? '').trim();
  if (!memberId) {
    redirect(
      `/events/${eventId}?error=${encodeURIComponent('Pick a member to assign.')}`,
    );
  }
  try {
    await api(`/v1/events/${eventId}/signup/${memberId}`, {
      method: 'POST',
      // Blank means the open-attendee pool rather than a crew position.
      body: JSON.stringify({ position: position || null }),
    });
  } catch (error) {
    redirect(
      `/events/${eventId}?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath(`/events/${eventId}`);
}

export async function removeMember(eventId: number, memberId: number) {
  try {
    await api(`/v1/events/${eventId}/signup/${memberId}`, { method: 'DELETE' });
  } catch (error) {
    redirect(
      `/events/${eventId}?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath(`/events/${eventId}`);
}

export async function setEventLocked(eventId: number, locked: boolean) {
  try {
    await api(`/v1/events/${eventId}/lock`, {
      method: 'PATCH',
      body: JSON.stringify({ locked }),
    });
  } catch (error) {
    redirect(
      `/events/${eventId}?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath(`/events/${eventId}`);
}
