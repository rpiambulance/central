/**
 * Reading one answer out of a form.
 *
 * Shared by the trainee's request and their later corrections so the two
 * cannot disagree about what a blank means or how a multi-select is read.
 */
export type ScorePayload = {
  itemId: number;
  scaleValue?: number;
  passed?: boolean;
  textValue?: string;
  optionValue?: string;
  optionValues?: string[];
  numberValue?: number;
};

export function scoreFromForm(
  item: { id: number; scoreType: string },
  formData: FormData,
): ScorePayload | null {
  const name = `item-${item.id}`;

  // Several checkboxes share one name, so this one is read as a list.
  if (item.scoreType === 'MULTI_SELECT') {
    const chosen = formData.getAll(name).map(String).filter(Boolean);
    return chosen.length ? { itemId: item.id, optionValues: chosen } : null;
  }

  const raw = formData.get(name);
  if (raw === null || raw === '') return null;
  if (item.scoreType === 'SCALE_1_5') {
    return { itemId: item.id, scaleValue: Number(raw) };
  }
  if (item.scoreType === 'PASS_FAIL') {
    return { itemId: item.id, passed: raw === 'pass' };
  }
  if (item.scoreType === 'OPTIONS') {
    return { itemId: item.id, optionValue: String(raw) };
  }
  if (item.scoreType === 'NUMBER') {
    const parsed = Number(raw);
    // Something unparseable leaves the answer unset rather than sending NaN.
    return Number.isFinite(parsed) ? { itemId: item.id, numberValue: parsed } : null;
  }
  return { itemId: item.id, textValue: String(raw) };
}
