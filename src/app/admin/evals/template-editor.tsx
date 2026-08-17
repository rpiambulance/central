'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export type EditorItem = {
  prompt: string;
  scoreType: string;
  /** One "value|Label" per line, for OPTIONS items. */
  optionsText: string;
};

const FIELD = 'h-8 rounded-md border border-input bg-background px-2 text-sm';

const SCORE_TYPES = [
  { value: 'SCALE_1_5', label: 'Score 1–5' },
  { value: 'PASS_FAIL', label: 'Pass / fail' },
  { value: 'TEXT', label: 'Free text' },
  { value: 'OPTIONS', label: 'Choose one' },
  { value: 'HEADING', label: 'Heading (not a question)' },
];

/**
 * Builds a form's items: any number of them, in any order.
 *
 * Options are written one per line as "value|Label" — the value is what gets
 * stored, the label what the evaluator sees, so wording can be reworded later
 * without orphaning answers already recorded. A line with no pipe uses the
 * text for both.
 */
export function TemplateEditor({
  initial,
  namePrefix = '',
}: {
  initial?: EditorItem[];
  namePrefix?: string;
}) {
  const [items, setItems] = useState<EditorItem[]>(
    initial?.length
      ? initial
      : [{ prompt: '', scoreType: 'SCALE_1_5', optionsText: '' }],
  );

  const update = (index: number, patch: Partial<EditorItem>) =>
    setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const move = (index: number, by: -1 | 1) => {
    const target = index + by;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };

  return (
    <div className="space-y-2">
      {/* Submitted in display order, so the server stores what is shown. */}
      <input type="hidden" name={`${namePrefix}itemCount`} value={items.length} />

      {items.map((item, index) => (
        <div key={index} className="rounded-md border p-3">
          <div className="flex flex-wrap items-end gap-2">
            <span className="w-6 pb-2 text-xs text-muted-foreground">
              {index + 1}
            </span>
            <label className="grid flex-1 gap-1 text-xs text-muted-foreground">
              {item.scoreType === 'HEADING' ? 'Heading' : 'Question'}
              <input
                name={`${namePrefix}prompt-${index}`}
                value={item.prompt}
                onChange={(event) =>
                  update(index, { prompt: event.target.value })
                }
                className={`${FIELD} w-full`}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Answer
              <select
                name={`${namePrefix}scoreType-${index}`}
                value={item.scoreType}
                onChange={(event) =>
                  update(index, { scoreType: event.target.value })
                }
                className={FIELD}
              >
                {SCORE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <span className="flex items-center gap-1 pb-0.5">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label="Move up"
                className="h-8 rounded border px-2 text-xs disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
                aria-label="Move down"
                className="h-8 rounded border px-2 text-xs disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => setItems(items.filter((_, i) => i !== index))}
                className="h-8 rounded border px-2 text-xs text-destructive"
              >
                remove
              </button>
            </span>
          </div>

          {item.scoreType === 'OPTIONS' ? (
            <label className="mt-2 grid gap-1 text-xs text-muted-foreground">
              Choices — one per line, as value|Label
              <textarea
                name={`${namePrefix}options-${index}`}
                value={item.optionsText}
                onChange={(event) =>
                  update(index, { optionsText: event.target.value })
                }
                rows={3}
                placeholder={'poor|Needs work\nok|Adequate\ngood|Strong'}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 font-mono text-sm"
              />
            </label>
          ) : null}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          setItems([
            ...items,
            { prompt: '', scoreType: 'SCALE_1_5', optionsText: '' },
          ])
        }
      >
        + Add item
      </Button>
    </div>
  );
}
