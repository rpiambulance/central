'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

const PAGE = '/headsup/notes';

export async function addNote(formData: FormData) {
  const body = String(formData.get('body') ?? '').trim();
  if (!body) redirect(`${PAGE}?error=${encodeURIComponent('Write something first.')}`);
  try {
    await api('/v1/headsup/notes', {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  } catch (error) {
    redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?done=note`);
}

export async function removeNote(id: number) {
  try {
    await api(`/v1/headsup/notes/${id}`, { method: 'DELETE' });
  } catch (error) {
    redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?done=note-removed`);
}

export async function addMishap(formData: FormData) {
  const note = String(formData.get('note') ?? '').trim();
  try {
    await api('/v1/headsup/mishaps', {
      method: 'POST',
      body: JSON.stringify(note ? { note } : {}),
    });
  } catch (error) {
    redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?done=mishap`);
}

export async function removeMishap(id: number) {
  try {
    await api(`/v1/headsup/mishaps/${id}`, { method: 'DELETE' });
  } catch (error) {
    redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?done=mishap-removed`);
}
