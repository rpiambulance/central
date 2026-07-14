'use server';

import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function createEval(formData: FormData) {
  const subjectId = Number(formData.get('subjectId'));
  const templateId = Number(formData.get('templateId'));
  const shiftDate = String(formData.get('shiftDate') ?? '');

  let created: { id: number };
  try {
    created = await api<{ id: number }>('/v1/evals', {
      method: 'POST',
      body: JSON.stringify({
        subjectId,
        templateId,
        ...(shiftDate ? { shiftDate } : {}),
      }),
    });
  } catch (error) {
    redirect(`/evals?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  redirect(`/evals/${created.id}`);
}
