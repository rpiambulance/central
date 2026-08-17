'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function clearForCalls(
  memberId: number,
  credentialKey: string,
) {
  try {
    await api('/v1/credentials/trainer-grant', {
      method: 'POST',
      body: JSON.stringify({ memberId, credentialKey }),
    });
  } catch (error) {
    redirect(
      `/training/clearances?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/training/clearances');
  redirect('/training/clearances?cleared=1');
}
