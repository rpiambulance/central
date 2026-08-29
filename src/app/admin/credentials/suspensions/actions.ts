'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

/**
 * Applies the held-back sweep in full.
 *
 * Deliberately a single button with no partial selection: the sweep is a
 * consequence of the rules as configured, so the question in front of the
 * officer is "are the rules right?", not "which of these people should the
 * rules apply to". Excusing an individual is a waiver, which lives on their
 * record and says why.
 */
export async function applySuspensions() {
  let result: { suspended: number; reinstated: number };
  try {
    result = await api<{ suspended: number; reinstated: number }>(
      '/v1/certifications/suspensions/apply',
      { method: 'POST' },
    );
  } catch (error) {
    redirect(
      `/admin/credentials/suspensions?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/admin/credentials/suspensions');
  redirect(
    `/admin/credentials/suspensions?applied=${result.suspended}&back=${result.reinstated}`,
  );
}
