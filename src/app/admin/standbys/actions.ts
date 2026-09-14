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

export async function addPlace(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) redirect(`${PAGE}?error=${encodeURIComponent('A place needs a name.')}`);
  const abbr = String(formData.get('abbr') ?? '').trim();
  const parent = String(formData.get('parentId') ?? '').trim();
  await post(
    '/v1/standbys/config/places',
    {
      name,
      address: String(formData.get('address') ?? '').trim() || undefined,
      // A letter makes this place a counter; a parent says which counter it
      // files under. One or the other, never invented from the name.
      abbr: abbr || undefined,
      parentId: parent ? Number(parent) : undefined,
    },
    'place',
  );
}

export async function addSpot(placeId: number, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) redirect(`${PAGE}?error=${encodeURIComponent('A spot needs a name.')}`);
  await post(`/v1/standbys/config/places/${placeId}/spots`, { name }, 'spot');
}

export async function retireLocation(locationId: number) {
  try {
    await api(`/v1/standbys/config/spots/${locationId}`, { method: 'DELETE' });
  } catch (error) {
    redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?done=retired`);
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
