'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

const PAGE = '/admin/members/invites';

export async function createInvite(formData: FormData) {
  const label = String(formData.get('label') ?? '').trim();
  const maxUses = String(formData.get('maxUses') ?? '').trim();
  const expiresAt = String(formData.get('expiresAt') ?? '').trim();
  try {
    await api('/v1/requests/invites', {
      method: 'POST',
      body: JSON.stringify({
        ...(label ? { label } : {}),
        ...(maxUses ? { maxUses: Number(maxUses) } : {}),
        // A date means the end of that day, not its first instant, or an
        // invite dated today is dead before anybody scans it.
        ...(expiresAt ? { expiresAt: `${expiresAt}T23:59:59.000Z` } : {}),
      }),
    });
  } catch (error) {
    redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(PAGE);
}

export async function closeInvite(code: string) {
  try {
    await api(`/v1/requests/invites/${encodeURIComponent(code)}/close`, {
      method: 'POST',
    });
  } catch (error) {
    redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(PAGE);
}
