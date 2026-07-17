'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function addFuelEntry(formData: FormData) {
  const loggedAtLocal = String(formData.get('loggedAt') ?? '');
  const vehicleId = Number(formData.get('vehicleId'));
  const amount = Number(formData.get('amount'));
  const mileage = Number(formData.get('mileage'));

  try {
    await api('/v1/fuel', {
      method: 'POST',
      body: JSON.stringify({
        loggedAt: new Date(loggedAtLocal).toISOString(),
        vehicleId,
        amount,
        mileage,
      }),
    });
  } catch (error) {
    redirect(`/ops/fuel?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath('/ops/fuel');
}
