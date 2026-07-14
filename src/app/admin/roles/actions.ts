'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function createRole(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const isOfficer = formData.get('isOfficer') === 'on';
  const permissions = formData.getAll('permissions').map(String);
  try {
    await api('/v1/roles', {
      method: 'POST',
      body: JSON.stringify({ name, isOfficer, permissions }),
    });
  } catch (error) {
    redirect(`/admin/roles?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath('/admin/roles');
}

export async function assignRole(roleId: number, formData: FormData) {
  const memberId = Number(formData.get('memberId'));
  const startDate = String(formData.get('startDate') ?? '');
  const endDate = String(formData.get('endDate') ?? '');
  try {
    await api(`/v1/roles/${roleId}/assignments`, {
      method: 'POST',
      body: JSON.stringify({
        memberId,
        startDate,
        ...(endDate ? { endDate } : {}),
      }),
    });
  } catch (error) {
    redirect(`/admin/roles?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath('/admin/roles');
}

export async function updateRole(roleId: number, formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const isOfficer = formData.get('isOfficer') === 'on';
  const permissions = formData.getAll('permissions').map(String);
  try {
    await api(`/v1/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, isOfficer, permissions }),
    });
  } catch (error) {
    redirect(`/admin/roles?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath('/admin/roles');
}

export async function deleteRole(roleId: number) {
  try {
    await api(`/v1/roles/${roleId}`, { method: 'DELETE' });
  } catch (error) {
    redirect(`/admin/roles?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath('/admin/roles');
}

export async function removeAssignment(assignmentId: number) {
  try {
    await api(`/v1/roles/assignments/${assignmentId}`, { method: 'DELETE' });
  } catch (error) {
    redirect(`/admin/roles?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath('/admin/roles');
}
