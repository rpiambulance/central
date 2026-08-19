'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

function fail(error: unknown): never {
  redirect(`/admin/chores?error=${encodeURIComponent(apiErrorMessage(error))}`);
}

/** The recurrence fields only mean something for their own cadence. */
function choreBody(formData: FormData) {
  const cadence = String(formData.get('cadence') ?? 'WEEKLY');
  const assigneeId = Number(formData.get('assigneeId'));
  const dueOn = String(formData.get('dueOn') ?? '').trim();
  return {
    name: String(formData.get('name') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
    cadence,
    ...(cadence === 'WEEKLY'
      ? { dayOfWeek: Number(formData.get('dayOfWeek')) || 0 }
      : {}),
    ...(cadence === 'MONTHLY'
      ? { dayOfMonth: Number(formData.get('dayOfMonth')) || 1 }
      : {}),
    ...(cadence === 'ONCE' && dueOn ? { dueOn } : {}),
    ...(Number.isInteger(assigneeId) && assigneeId > 0 ? { assigneeId } : {}),
    active: formData.get('active') === 'on',
  };
}

export async function createChore(formData: FormData) {
  try {
    await api('/v1/chores/definitions', {
      method: 'POST',
      body: JSON.stringify(choreBody(formData)),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/chores');
}

export async function updateChore(choreId: number, formData: FormData) {
  try {
    await api(`/v1/chores/definitions/${choreId}`, {
      method: 'PUT',
      body: JSON.stringify(choreBody(formData)),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/chores');
  revalidatePath('/chores');
}

export async function deleteChore(choreId: number) {
  try {
    await api(`/v1/chores/definitions/${choreId}`, { method: 'DELETE' });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/chores');
  revalidatePath('/chores');
}

export async function postChoresNow() {
  let posted = false;
  try {
    const result = await api<{ posted: boolean }>('/v1/chores/post-to-slack', {
      method: 'POST',
    });
    posted = result.posted;
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/chores');
  // Slack being unconfigured is not an error, but saying nothing looks like
  // the button did nothing.
  if (!posted) {
    redirect(
      `/admin/chores?error=${encodeURIComponent(
        'Nothing was posted — check the Slack bot token and chores channel in Settings.',
      )}`,
    );
  }
  redirect('/admin/chores?posted=1');
}
