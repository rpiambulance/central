'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

function fail(requestId: number, error: unknown): never {
  redirect(
    `/promotions/${requestId}?error=${encodeURIComponent(apiErrorMessage(error))}`,
  );
}

export async function castVote(requestId: number, formData: FormData) {
  const vote = String(formData.get('vote') ?? '');
  const notes = String(formData.get('notes') ?? '');
  try {
    await api(`/v1/promotions/requests/${requestId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ vote, ...(notes ? { notes } : {}) }),
    });
  } catch (error) {
    fail(requestId, error);
  }
  revalidatePath(`/promotions/${requestId}`);
}

export async function appointProxy(requestId: number, formData: FormData) {
  const proxyId = Number(formData.get('proxyId'));
  try {
    await api(`/v1/promotions/requests/${requestId}/proxy`, {
      method: 'POST',
      body: JSON.stringify({ proxyId }),
    });
  } catch (error) {
    fail(requestId, error);
  }
  revalidatePath(`/promotions/${requestId}`);
}

export async function captainDecision(requestId: number, formData: FormData) {
  const approved = formData.get('approved') === 'true';
  const notes = String(formData.get('notes') ?? '');
  try {
    await api(`/v1/promotions/requests/${requestId}/captain-decision`, {
      method: 'POST',
      body: JSON.stringify({ approved, ...(notes ? { notes } : {}) }),
    });
  } catch (error) {
    fail(requestId, error);
  }
  revalidatePath(`/promotions/${requestId}`);
}
