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

export async function withdrawProxy(requestId: number) {
  try {
    await api(`/v1/promotions/requests/${requestId}/proxy`, {
      method: 'DELETE',
    });
  } catch (error) {
    fail(requestId, error);
  }
  revalidatePath(`/promotions/${requestId}`);
}

export async function rescindVote(
  requestId: number,
  voteId: number,
  formData: FormData,
) {
  const notes = String(formData.get('notes') ?? '').trim();
  try {
    await api(`/v1/promotions/requests/${requestId}/votes/${voteId}/rescind`, {
      method: 'POST',
      body: JSON.stringify(notes ? { notes } : {}),
    });
  } catch (error) {
    fail(requestId, error);
  }
  revalidatePath(`/promotions/${requestId}`);
}

export async function recordMeetingVote(
  requestId: number,
  formData: FormData,
) {
  const count = (name: string) => Number(formData.get(name) ?? 0) || 0;
  const notes = String(formData.get('notes') ?? '').trim();
  try {
    await api(`/v1/promotions/requests/${requestId}/in-person-vote`, {
      method: 'POST',
      body: JSON.stringify({
        meetingDate: String(formData.get('meetingDate') ?? ''),
        approve: count('approve'),
        deny: count('deny'),
        abstain: count('abstain'),
        ...(notes ? { notes } : {}),
        approveAsCaptain: formData.get('approveAsCaptain') === 'on',
      }),
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
