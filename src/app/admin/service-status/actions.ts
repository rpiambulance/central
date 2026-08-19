'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function setServiceStatus(
  inService: boolean,
  formData?: FormData,
) {
  const reason = String(formData?.get('reason') ?? '').trim();
  try {
    await api('/v1/service-status', {
      method: 'PUT',
      body: JSON.stringify({ inService, ...(reason ? { reason } : {}) }),
    });
  } catch (error) {
    redirect(
      `/admin/service-status?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  // It is in the header of every page, so nothing may keep a stale copy.
  revalidatePath('/', 'layout');
}
