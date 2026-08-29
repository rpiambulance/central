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

/** What a send actually achieved, per person and per channel. */
export interface WarnResult {
  notified: number;
  results: Array<{
    memberId: number;
    memberName: string;
    email: string;
    slack: string;
  }>;
  summary: {
    emailSent: number;
    emailFailed: number;
    emailNoAddress: number;
    slackSent: number;
    slackFailed: number;
    slackNotLinked: number;
  };
}

export type WarnState = { ok?: WarnResult; error?: string } | null;

/**
 * Warns people that their credentials are at risk.
 *
 * Returns its result rather than redirecting, so the page can say what became
 * of each channel. "Warned five people" is worth very little if three of them
 * have no Slack account and the mail server is misconfigured — and the inbox
 * copy is written either way, so a count alone always looks like success.
 */
export async function warnPending(
  memberId: number | null,
  _previous: WarnState,
  formData: FormData,
): Promise<WarnState> {
  const email = formData.get('email') === 'on';
  const slack = formData.get('slack') === 'on';
  if (!email && !slack) return { error: 'Choose email, Slack, or both.' };
  try {
    const ok = await api<WarnResult>('/v1/certifications/suspensions/warn', {
      method: 'POST',
      body: JSON.stringify({
        ...(memberId ? { memberIds: [memberId] } : {}),
        email,
        slack,
      }),
    });
    revalidatePath(PAGE);
    return { ok };
  } catch (error) {
    return { error: apiErrorMessage(error) };
  }
}
