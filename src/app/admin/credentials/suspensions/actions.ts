'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

const PAGE = '/admin/credentials/suspensions';

/**
 * Applies the held-back sweep in full.
 *
 * Deliberately a single button with no per-person selection: the sweep is a
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
    redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?applied=${result.suspended}&back=${result.reinstated}`);
}

/**
 * Warns people that their credentials are at risk.
 *
 * `memberId` omitted means everybody on the list. The channels come from the
 * form, so the officer decides how loudly to say it.
 */
export async function warnPending(
  memberId: number | null,
  formData: FormData,
) {
  const email = formData.get('email') === 'on';
  const slack = formData.get('slack') === 'on';
  if (!email && !slack) {
    redirect(
      `${PAGE}?error=${encodeURIComponent('Choose email, Slack, or both.')}`,
    );
  }
  let result: { notified: number };
  try {
    result = await api<{ notified: number }>(
      '/v1/certifications/suspensions/warn',
      {
        method: 'POST',
        body: JSON.stringify({
          ...(memberId ? { memberIds: [memberId] } : {}),
          email,
          slack,
        }),
      },
    );
  } catch (error) {
    redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?warned=${result.notified}`);
}
