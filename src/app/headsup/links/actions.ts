'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

const PAGE = '/headsup/links';

export async function createLink(formData: FormData) {
  const label = String(formData.get('label') ?? '').trim();
  try {
    await api('/v1/headsup/links', {
      method: 'POST',
      body: JSON.stringify(label ? { label } : {}),
    });
  } catch (error) {
    redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?done=made`);
}

export async function revokeLink(id: number) {
  try {
    await api(`/v1/headsup/links/${id}`, { method: 'DELETE' });
  } catch (error) {
    redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?done=revoked`);
}

/**
 * Starting a counter again.
 *
 * Guarded twice over: the button asks first in the browser, and this refuses
 * without the typed confirmation, so a stray form post cannot clear a
 * season's number. Nothing is deleted either way — the count is a window
 * over data that is all still there.
 */
export async function resetCounter(counter: 'calls' | 'mishaps', formData: FormData) {
  if (String(formData.get('confirm') ?? '') !== 'yes') {
    redirect(
      `${PAGE}?error=${encodeURIComponent('The counter was not cleared — the confirmation was missing.')}`,
    );
  }
  try {
    await api(`/v1/headsup/counters/${counter}/reset`, { method: 'POST' });
  } catch (error) {
    redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(PAGE);
  revalidatePath('/headsup/notes');
  redirect(`${PAGE}?done=reset-${counter}`);
}
