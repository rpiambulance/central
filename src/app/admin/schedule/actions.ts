'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

function slotBody(formData: FormData): Record<string, unknown> {
  const placeholder = String(formData.get('placeholder') ?? '').trim();
  const memberId = String(formData.get('memberId') ?? '');
  if (placeholder) return { placeholder };
  if (memberId) return { memberId: Number(memberId) };
  return {};
}

export async function setSlot(
  crewId: number,
  position: string,
  formData: FormData,
) {
  try {
    await api(`/v1/crews/${crewId}/slots/${position}`, {
      method: 'PUT',
      body: JSON.stringify(slotBody(formData)),
    });
  } catch (error) {
    redirect(
      `/admin/schedule?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/admin/schedule');
}

export async function setDefaultSlot(
  weekday: number,
  position: string,
  formData: FormData,
) {
  try {
    await api('/v1/crews/defaults', {
      method: 'PUT',
      body: JSON.stringify({ weekday, position, ...slotBody(formData) }),
    });
  } catch (error) {
    redirect(
      `/admin/schedule?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/admin/schedule');
}
