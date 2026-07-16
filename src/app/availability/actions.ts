'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

const STATUSES = ['AVAILABLE', 'IF_NEEDED', 'UNAVAILABLE'] as const;

export async function savePollResponse(pollId: number, formData: FormData) {
  const entries = Array.from({ length: 7 }, (_, weekday) => {
    const raw = String(formData.get(`day-${weekday}`) ?? '');
    const status = (STATUSES as readonly string[]).includes(raw)
      ? raw
      : 'UNAVAILABLE';
    return { weekday, status };
  });
  try {
    await api(`/v1/availability/polls/${pollId}/response`, {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    });
  } catch (error) {
    redirect(
      `/availability?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/availability');
}
