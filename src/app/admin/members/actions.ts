'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

/** A member the new one might be a second copy of. */
export interface Existing {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  active?: boolean;
}

export type CreateState = {
  error?: string;
  /** Set when the name matched and the officer can confirm past it. */
  duplicateName?: { message: string; existing: Existing[] };
  added?: 'ok' | 'nologin';
} | null;

/**
 * Adds a member, asking once about a name that is already on the roster.
 *
 * Returns its result rather than redirecting, so the form keeps what was
 * typed: being told "there is already a Casey Reilly" and losing the other
 * five fields is a good way to make somebody stop reading the warning.
 */
export async function createMember(
  _previous: CreateState,
  formData: FormData,
): Promise<CreateState> {
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
          // Always sent now, rather than folded in with the optional fields.
          dob: String(formData.get('dob') ?? '').trim(),
          // Only ever set by pressing the confirm button below.
          ...(formData.get('confirmDuplicateName') === 'yes'
            ? { confirmDuplicateName: true }
            : {}),
          ...optional('rcsId'),
          ...optional('rin'),
        }),
      },
    );
  } catch (error) {
    const body =
      error instanceof ApiError
        ? (error.body as {
            code?: string;
            message?: string;
            existing?: Existing[];
          } | null)
        : null;
    if (body?.code === 'DUPLICATE_NAME') {
      return {
        duplicateName: {
          message: body.message ?? 'Somebody by that name is already here.',
          existing: body.existing ?? [],
        },
      };
    }
    return { error: apiErrorMessage(error) };
  }
  revalidatePath('/admin/members');
  return { added: created.keycloakLinked === false ? 'nologin' : 'ok' };
}

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
