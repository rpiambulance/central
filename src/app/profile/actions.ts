'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

export async function updateProfile(formData: FormData) {
  const body: Record<string, string> = {};
  for (const field of [
    // Theirs to set: being called the right thing is not a matter for an
    // officer. The legal first name beside it is, and is requested instead.
    'preferredFirstName',
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

/**
 * Asking an officer to change a field members cannot edit.
 *
 * Name and portal email are identity — the email is what a login is matched
 * on — so they are read-only here. That is not the same as unchangeable, and
 * "email an officer" is a worse process than one that leaves a record.
 */
export async function requestProfileChange(formData: FormData) {
  const field = String(formData.get('field') ?? '');
  const requestedValue = String(formData.get('requestedValue') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();
  try {
    await api('/v1/requests/profile', {
      method: 'POST',
      body: JSON.stringify({
        field,
        requestedValue,
        ...(reason ? { reason } : {}),
      }),
    });
  } catch (error) {
    redirect(`/profile?error=${encodeURIComponent(apiErrorMessage(error))}`);
  }
  revalidatePath('/profile');
  redirect('/profile?saved=requested');
}
