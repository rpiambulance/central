'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function requestPromotion(credentialTypeId: number) {
  try {
    await api('/v1/promotions/requests', {
      method: 'POST',
      body: JSON.stringify({ credentialTypeId }),
    });
  } catch (error) {
    redirect(`/training?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath('/training');
}
