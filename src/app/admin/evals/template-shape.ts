import type { EditorItem, EditorNode } from './template-editor';

export type ApiItem = {
  id?: number;
  order: number;
  prompt: string;
  scoreType: string;
  options?: Array<{ value: string; label: string }> | null;
  minValue?: number | null;
  maxValue?: number | null;
  unit?: string | null;
  signoffCredentialTypeId?: number | null;
};

export type ApiGroup = {
  id: number;
  order: number;
  heading: string;
  description?: string | null;
  items: ApiItem[];
};

export type ApiTemplate = {
  id: number;
  name: string;
  kind?: 'EVALUATION' | 'CHECKLIST';
  version: number;
  active: boolean;
  signoffCredentialTypeId?: number | null;
  signoffCredentialType?: { id: number; key: string; name: string } | null;
  items: ApiItem[];
  groups?: ApiGroup[];
};

function toEditorItem(item: ApiItem): EditorItem {
  return {
    prompt: item.prompt,
    scoreType: item.scoreType,
    optionsText: (item.options ?? [])
      .map((option) => `${option.value}|${option.label}`)
      .join('\n'),
    minValue: item.minValue === null || item.minValue === undefined ? '' : String(item.minValue),
    maxValue: item.maxValue === null || item.maxValue === undefined ? '' : String(item.maxValue),
    unit: item.unit ?? '',
    signoffCredentialTypeId: item.signoffCredentialTypeId
      ? String(item.signoffCredentialTypeId)
      : '',
  };
}

/**
 * Rebuilds the editor's node list from what the API returned.
 *
 * Loose items and groups share one ordering space, so the two lists are
 * merged on `order` rather than concatenated — otherwise every group would
 * jump to the bottom of the form the first time someone opened it to edit.
 */
export function toEditorNodes(template: ApiTemplate): EditorNode[] {
  const loose = template.items.map((item) => ({
    order: item.order,
    node: { kind: 'ITEM' as const, item: toEditorItem(item) },
  }));
  const groups = (template.groups ?? []).map((group) => ({
    order: group.order,
    node: {
      kind: 'GROUP' as const,
      heading: group.heading,
      description: group.description ?? '',
      items: group.items.map(toEditorItem),
    },
  }));
  return [...loose, ...groups]
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.node);
}
