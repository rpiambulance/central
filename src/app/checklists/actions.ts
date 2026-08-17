'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function signItem(
  templateId: number,
  memberId: number,
  itemId: number,
  formData: FormData,
) {
  const note = String(formData.get('note') ?? '').trim();
  const back = `/checklists/${templateId}/${memberId}`;
  try {
    await api(`/v1/checklists/items/${itemId}/sign`, {
      method: 'POST',
      body: JSON.stringify({ memberId, ...(note ? { note } : {}) }),
    });
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(back);
}

export async function revokeSignoff(
  templateId: number,
  memberId: number,
  signoffId: number,
  formData: FormData,
) {
  const reason = String(formData.get('reason') ?? '').trim();
  const back = `/checklists/${templateId}/${memberId}`;
  try {
    await api(`/v1/checklists/signoffs/${signoffId}/revoke`, {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {}),
    });
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(back);
}
