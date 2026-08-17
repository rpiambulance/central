'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

type ItemRef = {
  id: number;
  scoreType: 'SCALE_1_5' | 'PASS_FAIL' | 'TEXT' | 'OPTIONS' | 'HEADING';
};

type ScorePayload = {
  itemId: number;
  scaleValue?: number;
  passed?: boolean;
  textValue?: string;
  optionValue?: string;
};

export async function saveScores(
  evalId: number,
  items: ItemRef[],
  formData: FormData,
) {
  const submit = formData.get('intent') === 'submit';
  const notes = String(formData.get('notes') ?? '');
  const outcome = String(formData.get('outcome') ?? '');
  const readyRaw = String(formData.get('readyForPromotion') ?? '');

  const scores: ScorePayload[] = items.map((item) => {
    const raw = formData.get(`item-${item.id}`);
    const score: ScorePayload = { itemId: item.id };
    if (raw === null || raw === '') return score;
    if (item.scoreType === 'SCALE_1_5') {
      score.scaleValue = Number(raw);
    } else if (item.scoreType === 'PASS_FAIL') {
      score.passed = raw === 'pass';
    } else if (item.scoreType === 'OPTIONS') {
      score.optionValue = String(raw);
    } else {
      score.textValue = String(raw);
    }
    return score;
  });

  try {
    await api(`/v1/evals/${evalId}/scores`, {
      method: 'PUT',
      body: JSON.stringify({
        scores,
        notes,
        submit,
        ...(outcome === 'PASSED' || outcome === 'NEEDS_IMPROVEMENT'
          ? { outcome }
          : {}),
        ...(readyRaw ? { readyForPromotion: readyRaw === 'yes' } : {}),
      }),
    });
  } catch (error) {
    redirect(
      `/evals/${evalId}?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath(`/evals/${evalId}`);
}

export async function deleteEval(evalId: number) {
  try {
    await api(`/v1/evals/${evalId}`, { method: 'DELETE' });
  } catch (error) {
    redirect(
      `/evals/${evalId}?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/evals');
  redirect('/evals?deleted=1');
}

export async function signEval(evalId: number) {
  try {
    await api(`/v1/evals/${evalId}/sign`, { method: 'POST' });
  } catch (error) {
    redirect(
      `/evals/${evalId}?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath(`/evals/${evalId}`);
}
