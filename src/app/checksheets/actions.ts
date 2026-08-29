'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

/**
 * Submits a completed sheet.
 *
 * The answers arrive as one JSON field rather than as a form's worth of named
 * inputs: an item can carry a state, a count, a note and several dates, and
 * flattening that into field names only to parse them back out here would be
 * two chances to disagree about the shape.
 */
export async function completeChecksheet(formData: FormData) {
  const raw = String(formData.get('payload') ?? '');
  let result: { runId: number; shortfalls: number };
  try {
    result = await api<{ runId: number; shortfalls: number }>(
      '/v1/checksheets/complete',
      { method: 'POST', body: raw },
    );
  } catch (error) {
    redirect(`/checksheets?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath('/checksheets');
  redirect(
    `/checksheets?done=${result.runId}&short=${result.shortfalls}`,
  );
}

export async function resolveDeficiency(id: number, formData: FormData) {
  const note = String(formData.get('note') ?? '').trim();
  try {
    await api(`/v1/checksheets/deficiencies/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify(note ? { note } : {}),
    });
  } catch (error) {
    redirect(
      `/checksheets/deficiencies?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/checksheets/deficiencies');
}
