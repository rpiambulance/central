'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function createToken(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const permissions = formData.getAll('permissions').map(String);
  const expiresAt = String(formData.get('expiresAt') ?? '').trim();
  let secret: string;
  try {
    const created = await api<{ id: number; name: string; secret: string }>(
      '/v1/tokens',
      {
        method: 'POST',
        body: JSON.stringify({
          name,
          permissions,
          ...(expiresAt ? { expiresAt } : {}),
        }),
      },
    );
    secret = created.secret;
  } catch (error) {
    redirect(
      `/admin/tokens?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/admin/tokens');
  redirect(`/admin/tokens?secret=${encodeURIComponent(secret)}`);
}

export async function revokeToken(id: number) {
  try {
    await api(`/v1/tokens/${id}`, { method: 'DELETE' });
  } catch (error) {
    redirect(
      `/admin/tokens?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/admin/tokens');
}
