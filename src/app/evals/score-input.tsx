'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

export type ScoreType =
  | 'SCALE_1_5'
  | 'PASS_FAIL'
  | 'TEXT'
  | 'SHORT_TEXT'
  | 'NUMBER'
  | 'OPTIONS'
  | 'MULTI_SELECT'
  | 'HEADING'
  | 'SIGNOFF';

export type Item = {
  id: number;
  order: number;
  prompt: string;
  scoreType: ScoreType;
  options?: Array<{ value: string; label: string }> | null;
  minValue?: number | null;
  maxValue?: number | null;
  unit?: string | null;
  /** Whether the trainee fills this in when asking for the evaluation. */
  traineeInput?: 'NONE' | 'OPTIONAL' | 'REQUIRED';
};

export type Score = {
  itemId: number;
  scaleValue: number | null;
  passed: boolean | null;
  textValue: string | null;
  optionValue: string | null;
  optionValues: string[] | null;
  numberValue: number | null;
};

export function ReadOnlyScore({ item, score }: { item: Item; score?: Score }) {
  // A heading asks nothing, so there is nothing to show against it.
  if (item.scoreType === 'HEADING') return null;
  if (!score) return <span className="text-muted-foreground">&mdash;</span>;
  if (item.scoreType === 'OPTIONS') {
    const chosen = (item.options ?? []).find(
      (option) => option.value === score.optionValue,
    );
    return chosen ? (
      <span className="font-medium">{chosen.label}</span>
    ) : (
      <span className="text-muted-foreground">&mdash;</span>
    );
  }
  if (item.scoreType === 'MULTI_SELECT') {
    const chosen = (item.options ?? []).filter((option) =>
      (score.optionValues ?? []).includes(option.value),
    );
    return chosen.length ? (
      <span className="flex flex-wrap gap-1">
        {chosen.map((option) => (
          <Badge key={option.value} variant="secondary">
            {option.label}
          </Badge>
        ))}
      </span>
    ) : (
      <span className="text-muted-foreground">&mdash;</span>
    );
  }
  if (item.scoreType === 'NUMBER') {
    return score.numberValue !== null ? (
      <span className="font-medium">
        {score.numberValue}
        {item.unit ? ` ${item.unit}` : ''}
      </span>
    ) : (
      <span className="text-muted-foreground">&mdash;</span>
    );
  }
  if (item.scoreType === 'SCALE_1_5') {
    return score.scaleValue !== null ? (
      <span className="font-medium">{score.scaleValue} / 5</span>
    ) : (
      <span className="text-muted-foreground">&mdash;</span>
    );
  }
  if (item.scoreType === 'PASS_FAIL') {
    if (score.passed === null) {
      return <span className="text-muted-foreground">&mdash;</span>;
    }
    return (
      <Badge variant={score.passed ? 'default' : 'destructive'}>
        {score.passed ? 'Pass' : 'Fail'}
      </Badge>
    );
  }
  return score.textValue ? (
    <span className="whitespace-pre-wrap">{score.textValue}</span>
  ) : (
    <span className="text-muted-foreground">&mdash;</span>
  );
}

/**
 * One choice in a {@link ChoiceGroup}: a radio wearing a button.
 *
 * The input stays in the markup (visually hidden, not `hidden`) so the group
 * is still a real radio group — keyboard arrows, labels, and the form value
 * all behave as they would with a plain set of radios.
 */
function Choice({
  name,
  value,
  label,
  checked,
  tone = 'primary',
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  tone?: 'primary' | 'destructive' | 'muted';
}) {
  const selected =
    tone === 'destructive'
      ? 'peer-checked:border-destructive peer-checked:bg-destructive peer-checked:text-white'
      : tone === 'muted'
        ? 'peer-checked:border-foreground/40 peer-checked:bg-muted peer-checked:text-foreground'
        : 'peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground';
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={checked}
        className="peer sr-only"
      />
      <span
        className={`block rounded-md border border-input px-3 py-1.5 text-sm transition-colors hover:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 ${selected}`}
      >
        {label}
      </span>
    </label>
  );
}

/** A row of choices, with a way back to no answer at all. */
function ChoiceGroup({
  children,
  clear,
}: {
  children: ReactNode;
  clear: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      <span className="ml-1 border-l pl-3">{clear}</span>
    </div>
  );
}

export function ScoreInput({ item, score }: { item: Item; score?: Score }) {
  const name = `item-${item.id}`;
  if (item.scoreType === 'HEADING') return null;
  if (item.scoreType === 'OPTIONS') {
    const chosen = score?.optionValue ?? '';
    return (
      <ChoiceGroup
        clear={
          <Choice
            name={name}
            value=""
            label="No answer"
            checked={chosen === ''}
            tone="muted"
          />
        }
      >
        {(item.options ?? []).map((option) => (
          <Choice
            key={option.value}
            name={name}
            value={option.value}
            label={option.label}
            checked={chosen === option.value}
          />
        ))}
      </ChoiceGroup>
    );
  }
  if (item.scoreType === 'MULTI_SELECT') {
    // Checkboxes rather than a multi-select list: a list box hides how many
    // are picked and needs a modifier key to pick a second one.
    const chosen = score?.optionValues ?? [];
    return (
      <div className="flex flex-wrap items-center gap-2">
        {(item.options ?? []).map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={chosen.includes(option.value)}
              className="peer sr-only"
            />
            <span className="block rounded-md border border-input px-3 py-1.5 text-sm transition-colors hover:bg-muted peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    );
  }
  if (item.scoreType === 'NUMBER') {
    return (
      <span className="flex items-center gap-2">
        <input
          type="number"
          name={name}
          step="any"
          {...(item.minValue !== null && item.minValue !== undefined
            ? { min: item.minValue }
            : {})}
          {...(item.maxValue !== null && item.maxValue !== undefined
            ? { max: item.maxValue }
            : {})}
          defaultValue={score?.numberValue ?? ''}
          className="h-9 w-32 rounded-md border border-input bg-background px-2 text-sm"
        />
        {item.unit ? (
          <span className="text-sm text-muted-foreground">{item.unit}</span>
        ) : null}
      </span>
    );
  }
  if (item.scoreType === 'SHORT_TEXT') {
    return (
      <input
        type="text"
        name={name}
        defaultValue={score?.textValue ?? ''}
        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
      />
    );
  }
  if (item.scoreType === 'SCALE_1_5') {
    return (
      <select
        name={name}
        defaultValue={score?.scaleValue ?? ''}
        className="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm"
      >
        <option value="">&mdash;</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    );
  }
  if (item.scoreType === 'PASS_FAIL') {
    return (
      <ChoiceGroup
        clear={
          <Choice
            name={name}
            value=""
            label="No answer"
            checked={score?.passed === null || score?.passed === undefined}
            tone="muted"
          />
        }
      >
        <Choice
          name={name}
          value="pass"
          label="Pass"
          checked={score?.passed === true}
        />
        <Choice
          name={name}
          value="fail"
          label="Fail"
          checked={score?.passed === false}
          tone="destructive"
        />
      </ChoiceGroup>
    );
  }
  return (
    <textarea
      name={name}
      rows={3}
      defaultValue={score?.textValue ?? ''}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
    />
  );
}

/** One question on the form, ready to answer. A heading only labels. */
export function EditableItem({ item, score }: { item: Item; score?: Score }) {
  if (item.scoreType === 'HEADING') {
    return (
      <h3 className="pt-2 text-sm font-semibold tracking-tight">
        {item.prompt}
      </h3>
    );
  }
  return (
    <div className="space-y-1.5 rounded-md border p-4">
      <p className="text-sm font-medium">{item.prompt}</p>
      <ScoreInput item={item} score={score} />
    </div>
  );
}

export function ReadOnlyItem({ item, score }: { item: Item; score?: Score }) {
  if (item.scoreType === 'HEADING') {
    return (
      <h3 className="pt-2 text-sm font-semibold tracking-tight">
        {item.prompt}
      </h3>
    );
  }
  return (
    <div className="space-y-1.5 rounded-md border p-4">
      <p className="text-sm font-medium">{item.prompt}</p>
      <div className="text-sm">
        <ReadOnlyScore item={item} score={score} />
      </div>
    </div>
  );
}
