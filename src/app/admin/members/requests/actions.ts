'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

const PAGE = '/admin/members/requests';

/** The roster refusing a second Casey Reilly until somebody says it is one. */
function isDuplicateName(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return (error.body as { code?: string } | null)?.code === 'DUPLICATE_NAME';
}

export async function decideProfileChange(
  id: number,
  approve: boolean,
  formData: FormData,
) {
  const note = String(formData.get('note') ?? '').trim();
  try {
    await api(`/v1/requests/profile/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ approve, ...(note ? { note } : {}) }),
    });
  } catch (error) {
    redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(PAGE);
  redirect(`${PAGE}?decided=${approve ? 'applied' : 'declined'}`);
}

/**
 * Accepting a request, which makes the member.
 *
 * Two things can come back as questions rather than failures: a missing date
 * of birth, and a name already on the roster. Both are put to the officer on
 * the page — the date as a field to fill in, the name as a second press —
 * rather than swallowed, because only they can answer either.
 */
export async function decideAccountRequest(
  id: number,
  approve: boolean,
  formData: FormData,
) {
  const note = String(formData.get('note') ?? '').trim();
  const dob = String(formData.get('dob') ?? '').trim();
  const confirmDuplicateName =
    String(formData.get('confirmDuplicateName') ?? '') === 'yes';
  let created: { memberId: number | null; keycloakLinked: boolean | null };
  try {
    created = await api<{
      memberId: number | null;
      keycloakLinked: boolean | null;
    }>(`/v1/requests/account/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({
        approve,
        ...(note ? { note } : {}),
        ...(dob ? { dob } : {}),
        ...(confirmDuplicateName ? { confirmDuplicateName } : {}),
      }),
    });
  } catch (error) {
    // A matching name is a question, not a refusal: the page re-asks it with
    // the answer attached, the way the roster's own add form does.
    if (isDuplicateName(error)) {
      redirect(
        `${PAGE}?confirmName=${id}&error=${encodeURIComponent(apiErrorMessage(error))}`,
      );
    }
    redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath(PAGE);
  if (!approve) redirect(`${PAGE}?decided=declined`);
  // Whether they can sign in decides what the officer does next, so it is
  // said outright instead of leaving them to find out from the member.
  const outcome = created.memberId
    ? created.keycloakLinked === false
      ? 'made-nologin'
      : 'made'
    : 'noted';
  redirect(`${PAGE}?decided=${outcome}`);
}
