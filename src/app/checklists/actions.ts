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

/**
 * Starts a checklist. Without a member id it starts your own; naming somebody
 * else is a trainer putting them on it.
 */
export async function startChecklist(
  templateId: number,
  memberId: number | null,
  formData?: FormData,
) {
  const chosen = memberId ?? (Number(formData?.get('memberId')) || null);
  const back = memberId || chosen ? `/checklists/${templateId}` : '/checklists';
  try {
    await api(`/v1/checklists/${templateId}/start`, {
      method: 'POST',
      body: JSON.stringify(chosen ? { memberId: chosen } : {}),
    });
  } catch (error) {
    redirect(`${back}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath('/checklists');
  revalidatePath(`/checklists/${templateId}`);
}

/** Takes somebody off one nothing has been signed on. */
export async function unstartChecklist(
  templateId: number,
  memberId: number,
) {
  try {
    await api(`/v1/checklists/${templateId}/unstart`, {
      method: 'POST',
      body: JSON.stringify({ memberId }),
    });
  } catch (error) {
    redirect(
      `/checklists/${templateId}?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/checklists');
  revalidatePath(`/checklists/${templateId}`);
}
