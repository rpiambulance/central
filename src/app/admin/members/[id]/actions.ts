'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

function fail(memberId: number, error: unknown): never {
  redirect(
    `/admin/members/${memberId}?error=${encodeURIComponent(
      apiErrorMessage(error),
    )}`,
  );
}

export async function updateMember(memberId: number, formData: FormData) {
  const optional = (key: string) => {
    const value = String(formData.get(key) ?? '').trim();
    return value ? { [key]: value } : {};
  };
  try {
    await api(`/v1/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        firstName: String(formData.get('firstName') ?? '').trim(),
        lastName: String(formData.get('lastName') ?? '').trim(),
        email: String(formData.get('email') ?? '').trim(),
        ...optional('dob'),
        ...optional('personalEmail'),
        ...optional('cellPhone'),
        ...optional('localAddress'),
        ...optional('homeAddress'),
        ...optional('rcsId'),
        ...optional('rin'),
      }),
    });
  } catch (error) {
    fail(memberId, error);
  }
  revalidatePath(`/admin/members/${memberId}`);
}

export async function setMemberActive(memberId: number, active: boolean) {
  try {
    await api(`/v1/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
  } catch (error) {
    fail(memberId, error);
  }
  revalidatePath(`/admin/members/${memberId}`);
}

export async function grantCredential(memberId: number, formData: FormData) {
  try {
    await api('/v1/credentials/grant', {
      method: 'POST',
      body: JSON.stringify({
        memberId,
        credentialTypeId: Number(formData.get('credentialTypeId')),
      }),
    });
  } catch (error) {
    fail(memberId, error);
  }
  revalidatePath(`/admin/members/${memberId}`);
}

export async function revokeCredential(
  memberId: number,
  credentialTypeId: number,
) {
  try {
    await api(`/v1/credentials/${memberId}/${credentialTypeId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    fail(memberId, error);
  }
  revalidatePath(`/admin/members/${memberId}`);
}

export async function appointDutySupervisor(
  memberId: number,
  formData: FormData,
) {
  try {
    await api('/v1/credentials/appoint', {
      method: 'POST',
      body: JSON.stringify({
        memberId,
        credentialKey: 'DS',
        senior: formData.get('senior') === 'on',
      }),
    });
  } catch (error) {
    fail(memberId, error);
  }
  revalidatePath(`/admin/members/${memberId}`);
}
