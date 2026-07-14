'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function setAttendance(
  classId: number,
  memberId: number,
  formData: FormData,
) {
  try {
    await api(`/v1/trainings/classes/${classId}/attendance/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: String(formData.get('status') ?? '') }),
    });
  } catch (error) {
    redirect(
      `/admin/trainings/classes/${classId}?error=${encodeURIComponent(
        apiErrorMessage(error),
      )}`,
    );
  }
  revalidatePath(`/admin/trainings/classes/${classId}`);
}
