'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function issueRunNumber(formData: FormData) {
  const division = String(formData.get('division') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  let number: string;
  try {
    const issued = await api<{ number: string }>('/v1/run-numbers', {
      method: 'POST',
      body: JSON.stringify({
        locationId: Number(formData.get('locationId')),
        ...(division ? { division } : {}),
        ...(note ? { note } : {}),
      }),
    });
    number = issued.number;
  } catch (error) {
    redirect(
      `/call-ops/run-numbers?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/call-ops/run-numbers');
  // Carried back in the URL so it survives the redirect and can be read off
  // the screen — this is the number that goes on the report.
  redirect(`/call-ops/run-numbers?issued=${encodeURIComponent(number)}`);
}

export async function reopenChangeover() {
  try {
    await api('/v1/run-numbers/reopen-changeover', { method: 'POST' });
  } catch (error) {
    redirect(
      `/call-ops/run-numbers?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/call-ops/run-numbers');
  redirect('/call-ops/run-numbers?reopened=1');
}
