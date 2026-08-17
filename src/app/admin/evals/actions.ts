'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';
/**
 * Reads the editor's rows. There is no fixed number of them — the editor
 * submits its own count — and order is the order they were left in.
 *
 * Choices are written one per line as "value|Label": the value is stored, the
 * label displayed, so wording can change later without orphaning answers.
 * A line with no pipe uses its text for both.
 */
function itemsFromForm(formData: FormData) {
  const count = Number(formData.get('itemCount')) || 0;
  const items: Array<{
    order: number;
    prompt: string;
    scoreType: string;
    options?: Array<{ value: string; label: string }>;
  }> = [];

  for (let i = 0; i < count; i++) {
    const prompt = String(formData.get(`prompt-${i}`) ?? '').trim();
    if (!prompt) continue;
    const scoreType = String(formData.get(`scoreType-${i}`) ?? 'SCALE_1_5');
    const options =
      scoreType === 'OPTIONS'
        ? String(formData.get(`options-${i}`) ?? '')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const [value, ...rest] = line.split('|');
              const label = rest.join('|').trim();
              return {
                value: value.trim(),
                label: label || value.trim(),
              };
            })
        : undefined;

    items.push({
      order: items.length + 1,
      prompt,
      scoreType,
      ...(options?.length ? { options } : {}),
    });
  }
  return items;
}

export async function createTemplate(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  try {
    await api('/v1/evals/templates', {
      method: 'POST',
      body: JSON.stringify({ name, items: itemsFromForm(formData) }),
    });
  } catch (error) {
    redirect(
      `/admin/evals?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/admin/evals');
}

export async function reviseTemplate(templateId: number, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  try {
    await api(`/v1/evals/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, items: itemsFromForm(formData) }),
    });
  } catch (error) {
    redirect(
      `/admin/evals/${templateId}?error=${encodeURIComponent(
        apiErrorMessage(error),
      )}`,
    );
  }
  revalidatePath('/admin/evals');
  redirect('/admin/evals');
}
