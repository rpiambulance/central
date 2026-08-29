'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

function fail(error: unknown): never {
  redirect(`/resources?error=${encodeURIComponent(apiErrorMessage(error))}`);
}

export async function addResource(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const url = String(formData.get('url') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const position = String(formData.get('position') ?? '').trim();
  if (!title || !url) {
    redirect(
      `/resources?error=${encodeURIComponent('A link needs a title and an address.')}`,
    );
  }
  try {
    await api('/v1/resources', {
      method: 'POST',
      body: JSON.stringify({
        title,
        url,
        ...(description ? { description } : {}),
        ...(position ? { position: Number(position) } : {}),
      }),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/resources');
}

export async function editResource(id: number, formData: FormData) {
  const description = String(formData.get('description') ?? '').trim();
  const position = String(formData.get('position') ?? '').trim();
  try {
    await api(`/v1/resources/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: String(formData.get('title') ?? '').trim(),
        url: String(formData.get('url') ?? '').trim(),
        // Sent even when blank: clearing a description is an edit like any
        // other, and omitting it would mean "leave it alone".
        description,
        ...(position ? { position: Number(position) } : {}),
      }),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/resources');
}

export async function removeResource(id: number) {
  try {
    await api(`/v1/resources/${id}`, { method: 'DELETE' });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/resources');
}
