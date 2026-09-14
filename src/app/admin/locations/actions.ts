'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

const PAGE = '/admin/locations';

async function send(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown) {
  try {
    await api(path, {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?done=1`);
}

/** What the form says, as the API wants it. */
function fields(formData: FormData, mayCount: boolean) {
  const text = (key: string) => String(formData.get(key) ?? '').trim();
  const parent = text('parentId');
  return {
    name: text('name'),
    address: text('address') || null,
    notes: text('notes') || null,
    parentId: parent ? Number(parent) : null,
    // Only sent when the person may change them: the API refuses otherwise,
    // and sending an unchanged value would still be refused.
    ...(mayCount
      ? {
          abbr: text('abbr') || null,
          ...(text('nextRun') ? { nextRun: Number(text('nextRun')) } : {}),
        }
      : {}),
  };
}

export async function createPlace(mayCount: boolean, formData: FormData) {
  const body = fields(formData, mayCount);
  if (!body.name) {
    redirect(`${PAGE}?error=${encodeURIComponent('A place needs a name.')}`);
  }
  await send('/v1/places', 'POST', body);
}

export async function updatePlace(
  id: number,
  mayCount: boolean,
  formData: FormData,
) {
  await send(`/v1/places/${id}`, 'PATCH', {
    ...fields(formData, mayCount),
    active: formData.get('active') === 'on',
  });
}

export async function addSpot(placeId: number, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) redirect(`${PAGE}?error=${encodeURIComponent('A spot needs a name.')}`);
  await send(`/v1/places/${placeId}/spots`, 'POST', { name });
}

export async function retireSpot(spotId: number) {
  await send(`/v1/places/spots/${spotId}`, 'DELETE');
}
