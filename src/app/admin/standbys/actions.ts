'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

const PAGE = '/admin/standbys';

async function post(path: string, body: unknown, done: string) {
  try {
    await api(path, { method: 'POST', body: JSON.stringify(body) });
  } catch (error) {
    redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?done=${done}`);
}

export async function addDesignator(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) redirect(`${PAGE}?error=${encodeURIComponent('A unit needs a designator.')}`);
  await post('/v1/standbys/config/designators', { name }, 'designator');
}

export async function addHospital(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) redirect(`${PAGE}?error=${encodeURIComponent('A hospital needs a name.')}`);
  await post('/v1/standbys/config/hospitals', { name }, 'hospital');
}
