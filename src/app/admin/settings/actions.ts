'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

function fail(error: unknown): never {
  redirect(
    `/admin/settings?error=${encodeURIComponent(apiErrorMessage(error))}`,
  );
}

async function putSetting(key: string, value: unknown) {
  try {
    await api(`/v1/crews/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/settings');
}

// ---- scheduling knobs ----

export async function updateMinAgeYears(formData: FormData) {
  await putSetting('minAgeYears', Number(formData.get('value')));
}

export async function updateRiderSignupOpen(formData: FormData) {
  await putSetting('riderSignupOpen', {
    weekday: Number(formData.get('weekday')),
    time: String(formData.get('time') ?? ''),
  });
}

export async function updateRotationWeeks(formData: FormData) {
  await putSetting('rotationWeeks', Number(formData.get('value')));
}

export async function updateDayOfUnlockTime(formData: FormData) {
  await putSetting('dayOfUnlockTime', String(formData.get('value') ?? ''));
}

export async function updateProbationaryRequiresTrainer(formData: FormData) {
  await putSetting('probationaryRequiresTrainer', formData.get('value') === 'on');
}

export async function updateDropDeadline(formData: FormData) {
  await putSetting('dropDeadline', {
    daysBefore: Number(formData.get('daysBefore')),
    time: String(formData.get('time') ?? ''),
  });
}

// ---- certification types ----

export async function createCertificationType(formData: FormData) {
  const issuingOrg = String(formData.get('issuingOrg') ?? '').trim();
  const validity = String(formData.get('defaultValidityMonths') ?? '').trim();
  try {
    await api('/v1/certifications/types', {
      method: 'POST',
      body: JSON.stringify({
        name: String(formData.get('name') ?? '').trim(),
        abbreviation: String(formData.get('abbreviation') ?? '').trim(),
        ...(issuingOrg ? { issuingOrg } : {}),
        ...(validity ? { defaultValidityMonths: Number(validity) } : {}),
      }),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/settings');
}

export async function deactivateCertificationType(id: number) {
  try {
    await api(`/v1/certifications/types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: false }),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/settings');
}

// ---- event kinds ----

export async function createEventKind(formData: FormData) {
  try {
    await api('/v1/events/kinds', {
      method: 'POST',
      body: JSON.stringify({ name: String(formData.get('name') ?? '').trim() }),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/settings');
}

export async function deactivateEventKind(id: number) {
  try {
    await api(`/v1/events/kinds/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: false }),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/settings');
}

// ---- credential requirements ----

export async function addRequirement(
  credentialTypeId: number,
  formData: FormData,
) {
  const kind = String(formData.get('kind') ?? '');
  const body: Record<string, unknown> = { kind };
  if (kind === 'CERTIFICATION') {
    body.certificationTypeId = Number(formData.get('certificationTypeId'));
  } else if (kind === 'EVALUATION_COUNT') {
    body.evalTemplateId = Number(formData.get('evalTemplateId'));
    body.count = Number(formData.get('count'));
  } else if (kind === 'CLASS') {
    body.classId = Number(formData.get('classId'));
  }
  try {
    await api(`/v1/credentials/types/${credentialTypeId}/requirements`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/settings');
}

export async function removeRequirement(requirementId: number) {
  try {
    await api(`/v1/credentials/requirements/${requirementId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath('/admin/settings');
}
