'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, apiUpload } from '@/lib/api';
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

export async function registerForClass(classId: number) {
  try {
    await api(`/v1/trainings/classes/${classId}/register`, {
      method: 'POST',
    });
  } catch (error) {
    redirect(`/training?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath('/training');
}

export async function submitCertification(formData: FormData) {
  const typeId = Number(formData.get('typeId'));
  if (!typeId) {
    redirect(
      `/training?error=${encodeURIComponent('Pick a certification type.')}`,
    );
  }
  const identifier = String(formData.get('identifier') ?? '').trim();
  const issuedAt = String(formData.get('issuedAt') ?? '').trim();
  const expiresAt = String(formData.get('expiresAt') ?? '').trim();
  const file = formData.get('document');

  let created: { id: number };
  try {
    created = await api<{ id: number }>('/v1/certifications', {
      method: 'POST',
      body: JSON.stringify({
        typeId,
        ...(identifier ? { identifier } : {}),
        // Left blank, the API derives expiry from the type's validity period.
        ...(issuedAt ? { issuedAt: new Date(issuedAt).toISOString() } : {}),
        ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
      }),
    });
  } catch (error) {
    redirect(`/training?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }

  if (file instanceof File && file.size > 0) {
    const upload = new FormData();
    upload.append('file', file);
    try {
      await apiUpload(`/v1/certifications/${created.id}/documents`, upload);
    } catch (error) {
      // The certification is already recorded; say the attachment failed
      // rather than implying nothing was submitted.
      redirect(
        `/training?error=${encodeURIComponent(
          `Certification submitted, but the file did not attach: ${apiErrorMessage(error)}`,
        )}`,
      );
    }
  }
  revalidatePath('/training');
}
