'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

function fail(error: unknown): never {
  redirect(
    `/admin/trainings?error=${encodeURIComponent(apiErrorMessage(error))}`,
  );
}

export async function createAnnualRequirement(formData: FormData) {
  try {
    await api('/v1/trainings/annual', {
      method: 'POST',
      body: JSON.stringify({
        name: String(formData.get('name') ?? '').trim(),
        year: Number(formData.get('year')),
        alertOnLapse: formData.get('alertOnLapse') === 'on',
        blocksScheduling: formData.get('blocksScheduling') === 'on',
      }),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/trainings');
}

export async function setAlertOnLapse(id: number, alertOnLapse: boolean) {
  try {
    await api(`/v1/trainings/annual/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ alertOnLapse }),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/trainings');
}

export async function createClass(formData: FormData) {
  const description = String(formData.get('description') ?? '').trim();
  const sessionAt = String(formData.get('sessionAt') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();
  const seriesId = Number(formData.get('seriesId'));
  try {
    await api('/v1/trainings/classes', {
      method: 'POST',
      body: JSON.stringify({
        name: String(formData.get('name') ?? '').trim(),
        ...(description ? { description } : {}),
        ...(sessionAt ? { sessionAt } : {}),
        ...(location ? { location } : {}),
        ...(seriesId ? { seriesId } : {}),
      }),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/trainings');
}

export async function setBlocksScheduling(id: number, blocksScheduling: boolean) {
  try {
    await api(`/v1/trainings/annual/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ blocksScheduling }),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/admin/trainings?error=${encodeURIComponent(apiErrorMessage(error))}`);
    }
    throw error;
  }
  revalidatePath('/admin/trainings');
}

/** Months as entered, or null for a blank — a series whose sessions never lapse. */
function months(value: FormDataEntryValue | null): number | null {
  const n = Number(String(value ?? '').trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function createSeries(formData: FormData) {
  try {
    await api('/v1/trainings/series', {
      method: 'POST',
      body: JSON.stringify({
        name: String(formData.get('name') ?? '').trim(),
        validityMonths: months(formData.get('validityMonths')),
      }),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/trainings');
}

export async function setSeriesValidity(id: number, formData: FormData) {
  try {
    await api(`/v1/trainings/series/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        validityMonths: months(formData.get('validityMonths')),
      }),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/trainings');
}

/** Put a class in a series, or take it out of one. */
export async function setClassSeries(classId: number, formData: FormData) {
  const seriesId = Number(formData.get('seriesId'));
  try {
    await api(`/v1/trainings/classes/${classId}`, {
      method: 'PATCH',
      body: JSON.stringify({ seriesId: seriesId || null }),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/trainings');
}
