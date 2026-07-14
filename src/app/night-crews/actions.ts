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
