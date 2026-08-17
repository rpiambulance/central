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

function scheduleUrl(viewDate: string | undefined, errorMessage: string) {
  const params = new URLSearchParams();
  if (viewDate) params.set('viewDate', viewDate);
  params.set('error', errorMessage);
  return `/admin/schedule?${params.toString()}`;
}

export async function setSlot(
  crewId: number,
  position: string,
  viewDate: string | undefined,
  formData: FormData,
) {
  try {
    await api(`/v1/crews/${crewId}/slots/${position}`, {
      method: 'PUT',
      body: JSON.stringify(slotBody(formData)),
    });
  } catch (error) {
    redirect(scheduleUrl(viewDate, apiErrorMessage(error)));
  }
  revalidatePath('/admin/schedule');
}

export async function setDefaultSlot(
  weekday: number,
  position: string,
  viewDate: string | undefined,
  formData: FormData,
) {
  try {
    await api('/v1/crews/defaults', {
      method: 'PUT',
      body: JSON.stringify({ weekday, position, ...slotBody(formData) }),
    });
  } catch (error) {
    redirect(scheduleUrl(viewDate, apiErrorMessage(error)));
  }
  revalidatePath('/admin/schedule');
}

export interface SlotValue {
  memberId?: number | null;
  placeholder?: string | null;
}

/** Auto-save variant used by the client grid; returns errors instead of redirecting. */
export async function setSlotValue(
  crewId: number,
  position: string,
  value: SlotValue,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await api(`/v1/crews/${crewId}/slots/${position}`, {
      method: 'PUT',
      body: JSON.stringify(value),
    });
  } catch (error) {
    return { ok: false, error: apiErrorMessage(error) };
  }
  revalidatePath('/admin/schedule');
  return { ok: true };
}

export async function setDefaultSlotValue(
  weekday: number,
  position: string,
  value: SlotValue,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await api('/v1/crews/defaults', {
      method: 'PUT',
      body: JSON.stringify({ weekday, position, ...value }),
    });
  } catch (error) {
    return { ok: false, error: apiErrorMessage(error) };
  }
  revalidatePath('/admin/schedule');
  return { ok: true };
}

export async function bulkWeek(
  weekStart: string,
  action: 'clear' | 'apply-defaults',
) {
  try {
    await api('/v1/crews/bulk', {
      method: 'POST',
      body: JSON.stringify({ weekStart, action }),
    });
  } catch (error) {
    redirect(
      `/admin/schedule?viewDate=${weekStart}&error=${encodeURIComponent(
        apiErrorMessage(error),
      )}`,
    );
  }
  revalidatePath('/admin/schedule');
}
