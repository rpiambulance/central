'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function signupForSlot(crewId: number, position: string) {
  try {
    await api(`/v1/crews/${crewId}/slots/${position}/signup`, {
      method: 'POST',
    });
  } catch (error) {
    redirect(`/night-crews?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath('/night-crews');
}

export async function dropFromSlot(crewId: number, position: string) {
  try {
    await api(`/v1/crews/${crewId}/slots/${position}/signup`, {
      method: 'DELETE',
    });
  } catch (error) {
    redirect(`/night-crews?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath('/night-crews');
}

export async function declareAbsence(formData: FormData) {
  const date = String(formData.get('date') ?? '');
  const note = String(formData.get('note') ?? '').trim();
  try {
    await api('/v1/crews/absences', {
      method: 'POST',
      body: JSON.stringify({ date, ...(note ? { note } : {}) }),
    });
  } catch (error) {
    redirect(`/night-crews?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath('/night-crews');
}

export async function removeAbsence(absenceId: number) {
  try {
    await api(`/v1/crews/absences/${absenceId}`, { method: 'DELETE' });
  } catch (error) {
    redirect(`/night-crews?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath('/night-crews');
}
