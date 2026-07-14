'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function createToken(scope: string) {
  try {
    await api(`/v1/calendar/tokens/${scope}`, { method: 'POST' });
  } catch (error) {
    redirect(
      `/settings/calendar?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/settings/calendar');
}

export async function deleteToken(id: number) {
  try {
    await api(`/v1/calendar/tokens/${id}`, { method: 'DELETE' });
  } catch (error) {
    redirect(
      `/settings/calendar?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/settings/calendar');
}
