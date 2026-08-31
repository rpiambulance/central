'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

const PAGE = '/admin/members/requests';

export async function decideProfileChange(
  id: number,
  approve: boolean,
  formData: FormData,
) {
  const note = String(formData.get('note') ?? '').trim();
  try {
    await api(`/v1/requests/profile/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ approve, ...(note ? { note } : {}) }),
    });
  } catch (error) {
    redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?decided=${approve ? 'applied' : 'declined'}`);
}

export async function decideAccountRequest(
  id: number,
  approve: boolean,
  formData: FormData,
) {
  const note = String(formData.get('note') ?? '').trim();
  try {
    await api(`/v1/requests/account/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ approve, ...(note ? { note } : {}) }),
    });
  } catch (error) {
    redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?decided=${approve ? 'noted' : 'declined'}`);
}
