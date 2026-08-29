'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function createPoll(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const memberIds = formData
    .getAll('memberIds')
    .map((value) => Number(value))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (!name || memberIds.length === 0) {
    redirect(
      `/admin/availability?error=${encodeURIComponent(
        'A poll needs a name and at least one invited member.',
      )}`,
    );
  }
  try {
    await api('/v1/availability/polls', {
      method: 'POST',
      body: JSON.stringify({ name, memberIds }),
    });
  } catch (error) {
    redirect(
      `/admin/availability?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/admin/availability');
  // Carried back so the page can confirm what was made and to how many, and
  // so the form knows to clear itself — creating a poll and seeing the
  // filled-in form still sitting there reads as though nothing happened.
  redirect(
    `/admin/availability?created=${encodeURIComponent(name)}&invited=${memberIds.length}`,
  );
}

export async function setPollStatus(pollId: number, status: 'OPEN' | 'CLOSED') {
  try {
    await api(`/v1/availability/polls/${pollId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  } catch (error) {
    redirect(
      `/admin/availability/${pollId}?error=${encodeURIComponent(
        apiErrorMessage(error),
      )}`,
    );
  }
  revalidatePath(`/admin/availability/${pollId}`);
  revalidatePath('/admin/availability');
}

/**
 * Invite more people to a poll already running.
 *
 * Names come to mind after a poll goes out, and the alternative — a second
 * poll for the stragglers — splits one question's answers across two grids.
 * People already invited are left alone rather than asked again.
 */
export async function addPollMembers(pollId: number, formData: FormData) {
  const memberIds = formData
    .getAll('memberIds')
    .map((value) => Number(value))
    .filter((id) => Number.isFinite(id) && id > 0);
  if (!memberIds.length) {
    redirect(`/admin/availability/${pollId}?error=${encodeURIComponent('Pick at least one member to add.')}`);
  }
  try {
    await api(`/v1/availability/polls/${pollId}/invites`, {
      method: 'POST',
      body: JSON.stringify({ memberIds }),
    });
  } catch (error) {
    redirect(
      `/admin/availability/${pollId}?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath(`/admin/availability/${pollId}`);
  redirect(`/admin/availability/${pollId}?added=${memberIds.length}`);
}
