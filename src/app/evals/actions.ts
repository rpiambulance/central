'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';
import { scoreFromForm } from './score-field';

export async function createEval(formData: FormData) {
  const subjectId = Number(formData.get('subjectId'));
  const templateId = Number(formData.get('templateId'));
  const evalDate = String(formData.get('evalDate') ?? '');

  let created: { id: number };
  try {
    created = await api<{ id: number }>('/v1/evals', {
      method: 'POST',
      body: JSON.stringify({
        subjectId,
        templateId,
        ...(evalDate ? { evalDate } : {}),
      }),
    });
  } catch (error) {
    redirect(`/evals?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  redirect(`/evals/${created.id}`);
}

/**
 * A trainee asking a trainer to evaluate them.
 *
 * The trainee's own answers ride along with the request, so the trainer opens
 * something already half-filled rather than an empty form and a separate
 * message explaining what it was for.
 */
export async function requestEval(
  items: Array<{ id: number; scoreType: string }>,
  formData: FormData,
) {
  const evalDate = String(formData.get('evalDate') ?? '').trim();
  const scores = items
    .map((item) => scoreFromForm(item, formData))
    .filter((score) => score !== null);

  try {
    await api('/v1/evals/request', {
      method: 'POST',
      body: JSON.stringify({
        templateId: Number(formData.get('templateId')),
        evaluatorId: Number(formData.get('evaluatorId')),
        ...(evalDate ? { evalDate } : {}),
        ...(scores.length ? { scores } : {}),
      }),
    });
  } catch (error) {
    redirect(`/evals?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath('/evals');
  redirect('/evals?requested=1');
}
