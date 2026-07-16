'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function createPoll(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const memberIds = formData
    .getAll('memberIds')
    .map((value) => Number(value))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (!name || memberIds.length === 0) {
    redirect(
      `/admin/availability?error=${encodeURIComponent(
        'A poll needs a name and at least one invited member.',
      )}`,
    );
  }
  try {
    await api('/v1/availability/polls', {
      method: 'POST',
      body: JSON.stringify({ name, memberIds }),
    });
  } catch (error) {
    redirect(
      `/admin/availability?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/admin/availability');
}

export async function setPollStatus(pollId: number, status: 'OPEN' | 'CLOSED') {
  try {
    await api(`/v1/availability/polls/${pollId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  } catch (error) {
    redirect(
      `/admin/availability/${pollId}?error=${encodeURIComponent(
        apiErrorMessage(error),
      )}`,
    );
  }
  revalidatePath(`/admin/availability/${pollId}`);
  revalidatePath('/admin/availability');
}
