'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

const PAGE = '/admin/members/unlinked';

/**
 * Attaches a waiting login to a member.
 *
 * Closes the task in every officer's inbox, credited — the same shape as a
 * certification anybody could verify.
 */
export async function linkLogin(loginId: number, formData: FormData) {
  const memberId = Number(formData.get('memberId'));
  if (!memberId) {
    redirect(`${PAGE}?error=${encodeURIComponent('Choose who this is.')}`);
  }
  try {
    await api(`/v1/members/unlinked-logins/${loginId}/link`, {
      method: 'POST',
      body: JSON.stringify({ memberId }),
    });
  } catch (error) {
    redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?linked=1`);
}
