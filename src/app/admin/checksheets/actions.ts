'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

function fail(path: string, error: unknown): never {
  redirect(`${path}?error=${encodeURIComponent(apiErrorMessage(error))}`);
}

const text = (formData: FormData, name: string) =>
  String(formData.get(name) ?? '').trim();

export async function createTemplate(formData: FormData) {
  const assetKindId = text(formData, 'assetKindId');
  try {
    await api('/v1/checksheets', {
      method: 'POST',
      body: JSON.stringify({
        name: text(formData, 'name'),
        description: text(formData, 'description') || undefined,
        cadence: text(formData, 'cadence') || 'NONE',
        assetKindId: assetKindId ? Number(assetKindId) : null,
      }),
    });
  } catch (error) {
    fail('/admin/checksheets', error);
  }
  revalidatePath('/admin/checksheets');
}

export async function updateTemplate(id: number, formData: FormData) {
  const assetKindId = text(formData, 'assetKindId');
  const warnDays = text(formData, 'expiryWarningDays');
  try {
    await api(`/v1/checksheets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: text(formData, 'name'),
        description: text(formData, 'description'),
        cadence: text(formData, 'cadence'),
        assetKindId: assetKindId ? Number(assetKindId) : null,
        expiryWarningDays: warnDays ? Number(warnDays) : null,
        // The full set the form is showing; roles unticked are removed.
        notifyRoleIds: formData.getAll('notifyRoleIds').map(Number),
      }),
    });
  } catch (error) {
    fail(`/admin/checksheets/${id}`, error);
  }
  revalidatePath(`/admin/checksheets/${id}`);
}

export async function addSection(templateId: number, formData: FormData) {
  try {
    await api(`/v1/checksheets/${templateId}/sections`, {
      method: 'POST',
      body: JSON.stringify({
        heading: text(formData, 'heading'),
        description: text(formData, 'description') || undefined,
      }),
    });
  } catch (error) {
    fail(`/admin/checksheets/${templateId}`, error);
  }
  revalidatePath(`/admin/checksheets/${templateId}`);
}

export async function removeSection(templateId: number, sectionId: number) {
  try {
    await api(`/v1/checksheets/sections/${sectionId}`, { method: 'DELETE' });
  } catch (error) {
    fail(`/admin/checksheets/${templateId}`, error);
  }
  revalidatePath(`/admin/checksheets/${templateId}`);
}

export async function addItem(templateId: number, formData: FormData) {
  const sectionId = text(formData, 'sectionId');
  const parLevel = text(formData, 'parLevel');
  try {
    await api(`/v1/checksheets/${templateId}/items`, {
      method: 'POST',
      body: JSON.stringify({
        label: text(formData, 'label'),
        notes: text(formData, 'notes') || undefined,
        kind: text(formData, 'kind') || 'PRESENCE',
        parLevel: parLevel ? Number(parLevel) : undefined,
        expiryTracking: text(formData, 'expiryTracking') || 'NONE',
        sectionId: sectionId ? Number(sectionId) : null,
      }),
    });
  } catch (error) {
    fail(`/admin/checksheets/${templateId}`, error);
  }
  revalidatePath(`/admin/checksheets/${templateId}`);
}

export async function updateItem(
  templateId: number,
  itemId: number,
  formData: FormData,
) {
  const parLevel = text(formData, 'parLevel');
  try {
    await api(`/v1/checksheets/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        label: text(formData, 'label'),
        kind: text(formData, 'kind'),
        parLevel: parLevel ? Number(parLevel) : null,
        expiryTracking: text(formData, 'expiryTracking'),
      }),
    });
  } catch (error) {
    fail(`/admin/checksheets/${templateId}`, error);
  }
  revalidatePath(`/admin/checksheets/${templateId}`);
}

export async function removeItem(templateId: number, itemId: number) {
  try {
    await api(`/v1/checksheets/items/${itemId}`, { method: 'DELETE' });
  } catch (error) {
    fail(`/admin/checksheets/${templateId}`, error);
  }
  revalidatePath(`/admin/checksheets/${templateId}`);
}

export async function createAssetKind(formData: FormData) {
  try {
    await api('/v1/checksheets/asset-kinds', {
      method: 'POST',
      body: JSON.stringify({ name: text(formData, 'name') }),
    });
  } catch (error) {
    fail('/admin/checksheets', error);
  }
  revalidatePath('/admin/checksheets');
}

export async function createAsset(formData: FormData) {
  const vehicleId = text(formData, 'vehicleId');
  try {
    await api('/v1/checksheets/assets', {
      method: 'POST',
      body: JSON.stringify({
        name: text(formData, 'name'),
        kindId: Number(text(formData, 'kindId')),
        identifier: text(formData, 'identifier') || undefined,
        vehicleId: vehicleId ? Number(vehicleId) : null,
      }),
    });
  } catch (error) {
    fail('/admin/checksheets', error);
  }
  revalidatePath('/admin/checksheets');
}
