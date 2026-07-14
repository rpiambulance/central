'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function approveCertification(id: number) {
  try {
    await api(`/v1/certifications/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ approve: true }),
    });
  } catch (error) {
    redirect(
      `/admin/certifications?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/admin/certifications');
}

export async function rejectCertification(id: number, formData: FormData) {
  const reason = String(formData.get('reason') ?? '').trim();
  try {
    await api(`/v1/certifications/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ approve: false, ...(reason ? { reason } : {}) }),
    });
  } catch (error) {
    redirect(
      `/admin/certifications?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/admin/certifications');
}
