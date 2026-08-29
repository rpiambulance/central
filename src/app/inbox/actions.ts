'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

function fail(error: unknown): never {
  redirect(`/inbox?error=${encodeURIComponent(apiErrorMessage(error))}`);
}

export async function markRead(id: number) {
  try {
    await api(`/v1/inbox/${id}/read`, { method: 'POST' });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/inbox');
  revalidatePath('/', 'layout');
}

export async function markAllRead() {
  try {
    await api('/v1/inbox/read-all', { method: 'POST' });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/inbox');
  revalidatePath('/', 'layout');
}

export async function completeTask(id: number) {
  try {
    await api(`/v1/inbox/${id}/complete`, { method: 'POST' });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/inbox');
  revalidatePath('/', 'layout');
}

/**
 * Marks the task done and follows it through to wherever it is dealt with,
 * so acting on a task is one click rather than two.
 */
export async function startTask(id: number, actionUrl: string) {
  try {
    await api(`/v1/inbox/${id}/complete`, { method: 'POST' });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/inbox');
  revalidatePath('/', 'layout');
  redirect(actionUrl);
}

/**
 * Save the order the member has chosen, so their next visit opens that way.
 *
 * The order can also be switched for one visit through the query string —
 * that is trying it out. This is the one that sticks.
 */
export async function saveInboxSort(formData: FormData) {
  const sort = String(formData.get('sort') ?? '');
  try {
    await api('/v1/inbox/sort', {
      method: 'PUT',
      body: JSON.stringify({ sort }),
    });
  } catch (error) {
    redirect(`/inbox?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath('/inbox');
  redirect('/inbox');
}
