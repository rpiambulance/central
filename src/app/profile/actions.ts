'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function updateProfile(formData: FormData) {
  const body: Record<string, string> = {};
  for (const field of [
    'personalEmail',
    'cellPhone',
    'homePhone',
    'localAddress',
    'homeAddress',
  ]) {
    const value = formData.get(field);
    if (typeof value === 'string' && value.trim() !== '') {
      body[field] = value.trim();
    }
  }
  try {
    await api('/v1/members/me', { method: 'PATCH', body: JSON.stringify(body) });
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/profile?error=${encodeURIComponent(apiErrorMessage(error))}`);
    }
    throw error;
  }
  revalidatePath('/profile');
}

export async function updateNavLayout(formData: FormData) {
  const navLayout = formData.get('navLayout');
  if (navLayout !== 'sidebar' && navLayout !== 'topnav') return;
  try {
    await api('/v1/members/me', {
      method: 'PATCH',
      body: JSON.stringify({ navLayout }),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/profile?error=${encodeURIComponent(apiErrorMessage(error))}`);
    }
    throw error;
  }
  // the shell reads the preference in the root layout
  revalidatePath('/', 'layout');
}
