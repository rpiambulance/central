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
  redirect('/profile?saved=details');
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
  redirect('/profile?saved=layout');
}

export async function updateTimeFormat(formData: FormData) {
  const timeFormat = formData.get('timeFormat');
  if (timeFormat !== '24h' && timeFormat !== '12h') return;
  try {
    await api('/v1/members/me', {
      method: 'PATCH',
      body: JSON.stringify({ timeFormat }),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/profile?error=${encodeURIComponent(apiErrorMessage(error))}`);
    }
    throw error;
  }
  // Times are rendered on every page, so refresh the whole tree.
  revalidatePath('/', 'layout');
  redirect('/profile?saved=timeFormat');
}

/**
 * "These details are right."
 *
 * Saving the form does the same thing on the API side, so this is only for
 * the member who has read their details, found nothing to change, and needs
 * a way to say so — without which the only way to answer the request would be
 * to edit something that did not need editing.
 */
export async function confirmProfile() {
  try {
    await api('/v1/members/me/profile-review/confirm', { method: 'POST' });
  } catch (error) {
    redirect(`/profile?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath('/profile');
  redirect('/profile?confirmed=1');
}
