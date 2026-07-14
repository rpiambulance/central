'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

function fail(error: unknown): never {
  redirect(`/admin/radios?error=${encodeURIComponent(apiErrorMessage(error))}`);
}

export async function addRadio(formData: FormData) {
  const model = String(formData.get('model') ?? '').trim();
  const serial = String(formData.get('serial') ?? '').trim();
  try {
    await api('/v1/radios', {
      method: 'POST',
      body: JSON.stringify({
        number: String(formData.get('number') ?? '').trim(),
        ...(model ? { model } : {}),
        ...(serial ? { serial } : {}),
      }),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/radios');
}

export async function issueRadio(radioId: number, formData: FormData) {
  const memberId = Number(formData.get('memberId'));
  try {
    await api(`/v1/radios/${radioId}/issue/${memberId}`, { method: 'POST' });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/radios');
}

export async function returnRadio(radioId: number) {
  try {
    await api(`/v1/radios/${radioId}/issue`, { method: 'DELETE' });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/radios');
}
