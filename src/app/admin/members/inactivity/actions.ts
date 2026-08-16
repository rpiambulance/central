'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function deactivateSelected(formData: FormData) {
  const since = String(formData.get('since') ?? '');
  // Only the boxes still ticked at submit time — anyone deselected during the
  // review is simply absent, and is never touched.
  const memberIds = formData
    .getAll('memberIds')
    .map((value) => Number(value))
    .filter((id) => Number.isFinite(id));

  const back = `/admin/members/inactivity?since=${encodeURIComponent(since)}`;
  if (!memberIds.length) {
    redirect(`${back}&error=${encodeURIComponent('No members were selected.')}`);
  }

  let result: { deactivated: number };
  try {
    result = await api<{ deactivated: number }>('/v1/members/deactivate-many', {
      method: 'POST',
      body: JSON.stringify({
        memberIds,
        reason: `No participation since ${since}`,
      }),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`${back}&error=${encodeURIComponent(apiErrorMessage(error))}`);
    }
    throw error;
  }

  revalidatePath('/admin/members');
  redirect(`/admin/members?deactivated=${result.deactivated}`);
}
