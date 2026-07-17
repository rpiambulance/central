'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

function fail(error: unknown): never {
  if (error instanceof ApiError) {
    redirect(`/admin/vehicles?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  throw error;
}

export async function addVehicle(formData: FormData) {
  const body: Record<string, unknown> = {};
  for (const field of ['name', 'make', 'model', 'plate', 'vin', 'notes']) {
    const value = formData.get(field);
    if (typeof value === 'string' && value.trim()) body[field] = value.trim();
  }
  const year = formData.get('year');
  if (typeof year === 'string' && year.trim()) body.year = Number(year);
  try {
    await api('/v1/vehicles', { method: 'POST', body: JSON.stringify(body) });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/vehicles');
}

export async function setVehicleActive(id: number, active: boolean) {
  try {
    await api(`/v1/vehicles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/vehicles');
}
