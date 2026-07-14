'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

function fail(requirementId: number, error: unknown): never {
  redirect(
    `/admin/trainings/annual/${requirementId}?error=${encodeURIComponent(
      apiErrorMessage(error),
    )}`,
  );
}

export async function markComplete(requirementId: number, memberId: number) {
  try {
    await api(`/v1/trainings/annual/${requirementId}/completions/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify({}),
    });
  } catch (error) {
    fail(requirementId, error);
  }
  revalidatePath(`/admin/trainings/annual/${requirementId}`);
}

export async function unmarkComplete(requirementId: number, memberId: number) {
  try {
    await api(`/v1/trainings/annual/${requirementId}/completions/${memberId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    fail(requirementId, error);
  }
  revalidatePath(`/admin/trainings/annual/${requirementId}`);
}
