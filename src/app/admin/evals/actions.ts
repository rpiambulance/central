'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/errors';

type RawItem = {
  prompt?: string;
  scoreType?: string;
  optionsText?: string;
  minValue?: string;
  maxValue?: string;
  unit?: string;
  signoffCredentialTypeId?: string;
};

type RawNode =
  | { kind: 'ITEM'; item: RawItem }
  | { kind: 'GROUP'; heading?: string; description?: string; items?: RawItem[] };

const HAS_OPTIONS = ['OPTIONS', 'MULTI_SELECT'];

/**
 * Choices are written one per line as "value|Label": the value is stored, the
 * label displayed, so wording can change later without orphaning answers
 * already recorded. A line with no pipe uses its text for both.
 */
function parseOptions(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [value, ...rest] = line.split('|');
      const label = rest.join('|').trim();
      return { value: value.trim(), label: label || value.trim() };
    });
}

/** A blank number field means "no bound", not zero. */
function toNumber(value: string | undefined): number | undefined {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toItem(raw: RawItem) {
  const prompt = (raw.prompt ?? '').trim();
  if (!prompt) return null;
  const scoreType = raw.scoreType ?? 'SCALE_1_5';
  const options = HAS_OPTIONS.includes(scoreType)
    ? parseOptions(raw.optionsText ?? '')
    : [];
  const signoff = toNumber(raw.signoffCredentialTypeId);
  return {
    prompt,
    scoreType,
    ...(options.length ? { options } : {}),
    ...(scoreType === 'NUMBER'
      ? {
          minValue: toNumber(raw.minValue),
          maxValue: toNumber(raw.maxValue),
          unit: (raw.unit ?? '').trim() || undefined,
        }
      : {}),
    ...(signoff !== undefined ? { signoffCredentialTypeId: signoff } : {}),
  };
}

/**
 * Reads the editor's structure, which it submits as one JSON field.
 *
 * Items with no text are dropped, and a group left with nothing in it goes
 * too — an empty heading on a form is just clutter.
 */
function nodesFromForm(formData: FormData) {
  let raw: RawNode[];
  try {
    raw = JSON.parse(String(formData.get('nodes') ?? '[]')) as RawNode[];
  } catch {
    return [];
  }

  const nodes = [];
  for (const node of raw) {
    if (node.kind === 'GROUP') {
      const items = (node.items ?? []).map(toItem).filter((i) => i !== null);
      const heading = (node.heading ?? '').trim();
      if (!heading || !items.length) continue;
      nodes.push({
        kind: 'GROUP' as const,
        heading,
        description: (node.description ?? '').trim() || undefined,
        items,
      });
    } else {
      const item = toItem(node.item ?? {});
      if (item) nodes.push({ kind: 'ITEM' as const, ...item });
    }
  }
  return nodes;
}

function templateBody(formData: FormData) {
  const kind = String(formData.get('kind') ?? 'EVALUATION');
  const signoff = toNumber(String(formData.get('signoffCredentialTypeId') ?? ''));
  return {
    name: String(formData.get('name') ?? '').trim(),
    kind,
    ...(kind === 'CHECKLIST' ? { signoffCredentialTypeId: signoff ?? null } : {}),
    nodes: nodesFromForm(formData),
  };
}

export async function createTemplate(formData: FormData) {
  try {
    await api('/v1/evals/templates', {
      method: 'POST',
      body: JSON.stringify(templateBody(formData)),
    });
  } catch (error) {
    redirect(
      `/admin/evals?error=${encodeURIComponent(apiErrorMessage(error))}`,
    );
  }
  revalidatePath('/admin/evals');
}

export async function reviseTemplate(templateId: number, formData: FormData) {
  try {
    await api(`/v1/evals/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(templateBody(formData)),
    });
  } catch (error) {
    redirect(
      `/admin/evals/${templateId}?error=${encodeURIComponent(
        apiErrorMessage(error),
      )}`,
    );
  }
  revalidatePath('/admin/evals');
  redirect('/admin/evals');
}
