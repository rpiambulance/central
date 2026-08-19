'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function completeChore(occurrenceId: number, formData?: FormData) {
  const note = String(formData?.get('note') ?? '').trim();
  try {
    await api(`/v1/chores/${occurrenceId}/complete`, {
      method: 'POST',
      body: JSON.stringify(note ? { note } : {}),
    });
  } catch (error) {
    redirect(`/chores?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath('/chores');
}

export async function reopenChore(occurrenceId: number) {
  try {
    await api(`/v1/chores/${occurrenceId}/reopen`, { method: 'POST' });
  } catch (error) {
    redirect(`/chores?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath('/chores');
}
