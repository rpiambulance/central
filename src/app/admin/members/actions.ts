'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function createMember(formData: FormData) {
  const optional = (key: string) => {
    const value = String(formData.get(key) ?? '').trim();
    return value ? { [key]: value } : {};
  };
  let created: { id: number; keycloakLinked?: boolean };
  try {
    created = await api<{ id: number; keycloakLinked?: boolean }>(
      '/v1/members',
      {
        method: 'POST',
        body: JSON.stringify({
          firstName: String(formData.get('firstName') ?? '').trim(),
          lastName: String(formData.get('lastName') ?? '').trim(),
          email: String(formData.get('email') ?? '').trim(),
          ...optional('dob'),
          ...optional('rcsId'),
          ...optional('rin'),
        }),
      },
    );
  } catch (error) {
    redirect(
      `/admin/members?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/admin/members');
  // Adding somebody who cannot sign in looks exactly like adding somebody who
  // can, and the difference only shows up when they try. Say which happened.
  redirect(
    `/admin/members?added=${created.keycloakLinked === false ? 'nologin' : 'ok'}`,
  );
}

/**
 * Ask everybody active to check their own details.
 *
 * Inactive members are skipped by the API rather than filtered here: somebody
 * who has left should not be given a task, still less emailed about one.
 */
export async function requestProfileReviewFromAll(formData: FormData) {
  const note = String(formData.get('note') ?? '').trim();
  let asked = 0;
  try {
    const result = await api<{ asked: number }>(
      '/v1/members/profile-review/request-all',
      { method: 'POST', body: JSON.stringify(note ? { note } : {}) },
    );
    asked = result.asked;
  } catch (error) {
    redirect(
      `/admin/members?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/admin/members');
  redirect(`/admin/members?asked=${asked}`);
}
