'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
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
  try {
    await api('/v1/trainings/classes', {
      method: 'POST',
      body: JSON.stringify({
        name: String(formData.get('name') ?? '').trim(),
        ...(description ? { description } : {}),
        ...(sessionAt ? { sessionAt } : {}),
        ...(location ? { location } : {}),
      }),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/trainings');
}
