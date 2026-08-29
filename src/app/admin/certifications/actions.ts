'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

/**
 * Approve, with whatever the verifier corrected on the way through.
 *
 * The details on a submission are typed from a card by whoever is holding it,
 * and the person checking it against the card is the one best placed to fix a
 * transposed digit or a missing issue date. Sending it back for the member to
 * resubmit costs a round trip to fix something the verifier is looking at.
 *
 * Fields left as they were submitted are sent unchanged, so approving without
 * touching anything behaves exactly as it did before.
 */
export async function approveCertification(id: number, formData?: FormData) {
  const field = (name: string) => {
    const value = formData?.get(name);
    return value === null || value === undefined ? undefined : String(value).trim();
  };
  const corrections = {
    ...(field('identifier') === undefined ? {} : { identifier: field('identifier') || null }),
    ...(field('issuedAt') === undefined ? {} : { issuedAt: field('issuedAt') || null }),
    ...(field('expiresAt') === undefined ? {} : { expiresAt: field('expiresAt') || null }),
  };
  try {
    await api(`/v1/certifications/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({
        approve: true,
        ...(Object.keys(corrections).length ? { corrections } : {}),
      }),
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
