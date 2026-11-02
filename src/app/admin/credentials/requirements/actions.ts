'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

const PAGE = '/admin/credentials/requirements';

function fail(error: unknown): never {
  redirect(`${PAGE}?error=${encodeURIComponent(apiErrorMessage(error))}`);
}

/** The dates on a requirement that say when it applies and what counts. */
const REQUIREMENT_DATES = [
  'effectiveFrom',
  'effectiveUntil',
  'countsFrom',
  'validThrough',
] as const;

/**
 * A date input's value as the API takes it — a date-only value, which the
 * API reads as the New York calendar day — or null when left blank.
 */
function dateOnly(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return text ? `${text}T00:00:00.000Z` : null;
}

/** Every date is sent, blank as null, so clearing a field clears it. */
export async function setRequirementDates(
  requirementId: number,
  formData: FormData,
) {
  try {
    await api(`/v1/credentials/requirements/${requirementId}/dates`, {
      method: 'PATCH',
      body: JSON.stringify(
        Object.fromEntries(
          REQUIREMENT_DATES.map((field) => [field, dateOnly(formData.get(field))]),
        ),
      ),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath(PAGE);
}

export async function addDatedRequirement(formData: FormData) {
  const credentialTypeId = Number(formData.get('credentialTypeId'));
  const kind = String(formData.get('kind') ?? '');
  const group = String(formData.get('alternativeGroup') ?? '').trim();
  const body: Record<string, unknown> = {
    kind,
    scope: String(formData.get('scope') ?? 'ONGOING'),
    ...(group ? { alternativeGroup: group } : {}),
  };
  for (const field of REQUIREMENT_DATES) {
    const value = dateOnly(formData.get(field));
    if (value) body[field] = value;
  }
  if (kind === 'CERTIFICATION') {
    body.certificationTypeId = Number(formData.get('certificationTypeId'));
  } else if (kind === 'EVALUATION_COUNT') {
    body.evalTemplateId = Number(formData.get('evalTemplateId'));
    body.count = Number(formData.get('count'));
  } else if (kind === 'CHECKLIST') {
    body.evalTemplateId = Number(formData.get('evalTemplateId'));
  } else if (kind === 'CLASS') {
    // A series is any session of the class, this year's or next; one class
    // is that session only. The series wins if both were picked.
    const series = Number(formData.get('classSeriesId'));
    if (series) body.classSeriesId = series;
    else body.classId = Number(formData.get('classId'));
  }
  try {
    await api(`/v1/credentials/types/${credentialTypeId}/dated-requirements`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath(PAGE);
}

export async function removeDatedRequirement(requirementId: number) {
  try {
    await api(`/v1/credentials/requirements/${requirementId}/dated`, {
      method: 'DELETE',
    });
  } catch (error) {
    fail(error);
  }
  revalidatePath(PAGE);
}

/** Who the requirement would suspend once it applies. */
export async function requirementImpact(requirementId: number) {
  return api<{
    requirement: string;
    /** The day it is judged on: today, or the day it takes effect. */
    asOf: string;
    members: Array<{ id: number; name: string; reason: string }>;
  }>(`/v1/credentials/requirements/${requirementId}/impact`);
}
