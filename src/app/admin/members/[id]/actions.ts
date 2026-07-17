'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
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

function adjustFail(memberId: number, error: unknown): never {
  if (error instanceof ApiError) {
    redirect(
      `/admin/members/${memberId}?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  throw error;
}

export async function waiveRequirement(
  memberId: number,
  credentialTypeId: number,
  requirementId: number,
  formData: FormData,
) {
  const note = String(formData.get('note') ?? '').trim();
  try {
    await api('/v1/promotions/adjustments', {
      method: 'POST',
      body: JSON.stringify({
        memberId,
        credentialTypeId,
        kind: 'WAIVER',
        requirementId,
        ...(note ? { note } : {}),
      }),
    });
  } catch (error) {
    adjustFail(memberId, error);
  }
  revalidatePath(`/admin/members/${memberId}`);
}

export async function addAdditionalRequirement(
  memberId: number,
  credentialTypeId: number,
  formData: FormData,
) {
  const reqKind = String(formData.get('reqKind') ?? 'CUSTOM');
  const note = String(formData.get('note') ?? '').trim();
  const body: Record<string, unknown> = {
    memberId,
    credentialTypeId,
    kind: 'ADDITIONAL',
    ...(note ? { note } : {}),
  };
  if (reqKind !== 'CUSTOM') {
    body.reqKind = reqKind;
    for (const field of ['certificationTypeId', 'evalTemplateId', 'count', 'classId']) {
      const value = String(formData.get(field) ?? '').trim();
      if (value) body[field] = Number(value);
    }
  }
  try {
    await api('/v1/promotions/adjustments', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (error) {
    adjustFail(memberId, error);
  }
  revalidatePath(`/admin/members/${memberId}`);
}

export async function setAdjustmentSatisfied(
  memberId: number,
  adjustmentId: number,
  satisfied: boolean,
) {
  try {
    await api(`/v1/promotions/adjustments/${adjustmentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ satisfied }),
    });
  } catch (error) {
    adjustFail(memberId, error);
  }
  revalidatePath(`/admin/members/${memberId}`);
}

export async function removeAdjustment(memberId: number, adjustmentId: number) {
  try {
    await api(`/v1/promotions/adjustments/${adjustmentId}`, { method: 'DELETE' });
  } catch (error) {
    adjustFail(memberId, error);
  }
  revalidatePath(`/admin/members/${memberId}`);
}
