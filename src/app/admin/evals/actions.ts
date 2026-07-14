'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';
import { ITEM_ROWS } from './template-form';

function itemsFromForm(formData: FormData) {
  const items: Array<{ order: number; prompt: string; scoreType: string }> = [];
  for (let i = 0; i < ITEM_ROWS; i++) {
    const prompt = String(formData.get(`prompt-${i}`) ?? '').trim();
    if (!prompt) continue;
    items.push({
      order: items.length + 1,
      prompt,
      scoreType: String(formData.get(`scoreType-${i}`) ?? 'SCALE_1_5'),
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
