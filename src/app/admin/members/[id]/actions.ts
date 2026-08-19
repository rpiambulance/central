'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, apiUpload, ApiError } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

function fail(memberId: number, error: unknown, prefix?: string): never {
  const message = prefix
    ? `${prefix}: ${apiErrorMessage(error)}`
    : apiErrorMessage(error);
  redirect(`/admin/members/${memberId}?error=${encodeURIComponent(message)}`);
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
        ...optional('nineHundredNumber'),
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
        // Optional: leave blank to record the credential now and date it once
        // the promotion date is known.
        effectiveAt: String(formData.get('effectiveAt') ?? '') || undefined,
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

export async function setCredentialDate(
  memberId: number,
  credentialTypeId: number,
  formData: FormData,
) {
  const effectiveAt = String(formData.get('effectiveAt') ?? '').trim();
  try {
    await api(`/v1/credentials/${memberId}/${credentialTypeId}/effective-date`, {
      method: 'PATCH',
      // Blank clears the date back to unknown.
      body: JSON.stringify({ effectiveAt: effectiveAt || null }),
    });
  } catch (error) {
    fail(memberId, error);
  }
  revalidatePath(`/admin/members/${memberId}`);
}

export async function recordCertification(memberId: number, formData: FormData) {
  const typeId = Number(formData.get('typeId'));
  if (!typeId) return;
  const identifier = String(formData.get('identifier') ?? '').trim();
  const issuedAt = String(formData.get('issuedAt') ?? '').trim();
  const expiresAt = String(formData.get('expiresAt') ?? '').trim();
  const files = formData
    .getAll('documents')
    .filter((file): file is File => file instanceof File && file.size > 0);

  let created: { id: number };
  try {
    created = await api<{ id: number }>(`/v1/certifications/member/${memberId}`, {
      method: 'POST',
      body: JSON.stringify({
        typeId,
        ...(identifier ? { identifier } : {}),
        ...(issuedAt ? { issuedAt: new Date(issuedAt).toISOString() } : {}),
        ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
      }),
    });
  } catch (error) {
    fail(memberId, error);
  }

  // Attached one at a time, after the record exists to hang them on. A file
  // that fails is reported as such: the certification is already recorded,
  // and saying nothing happened would send someone looking for it in vain.
  for (const file of files) {
    const upload = new FormData();
    upload.append('file', file);
    try {
      await apiUpload(`/v1/certifications/${created.id}/documents`, upload);
    } catch (error) {
      fail(
        memberId,
        error,
        `Certification recorded, but ${file.name} did not attach`,
      );
    }
  }
  revalidatePath(`/admin/members/${memberId}`);
}

/** Removes a file from a certification. */
export async function removeCertificationDocument(
  memberId: number,
  documentId: string,
) {
  try {
    await api(`/v1/certifications/documents/${documentId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    fail(memberId, error);
  }
  revalidatePath(`/admin/members/${memberId}`);
}
