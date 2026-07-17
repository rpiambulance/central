'use client';

import { useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { setDefaultSlotValue, setSlotValue, type SlotValue } from './actions';
import { useUndo } from './undo-context';
import { cn } from '@/lib/utils';

export interface SlotSelectProps {
  kind: 'slot' | 'default';
  target: number; // crewId or weekday
  position: string;
  label: string; // for the undo history, e.g. "Thu Jul 16 — Crew Chief"
  members: Array<{ id: number; firstName: string; lastName: string }>;
  memberId?: number | null;
  placeholder?: string | null;
}

const PLACEHOLDER_OPTION = '__placeholder__';

/**
 * Auto-saving slot control: pick a member (or vacant) and it saves
 * immediately, recording the previous value on the undo stack.
 * "Label…" opens an inline popover for placeholder text (e.g. CLOSED).
 */
export function SlotSelect({
  kind,
  target,
  position,
  label,
  members,
  memberId,
  placeholder,
}: SlotSelectProps) {
  const { push, setError } = useUndo();
  const [pending, startTransition] = useTransition();
  const [labelOpen, setLabelOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const selectRef = useRef<HTMLSelectElement>(null);

  const current = placeholder ? PLACEHOLDER_OPTION : String(memberId ?? '');
  const previous: SlotValue = {
    memberId: memberId ?? null,
    placeholder: placeholder ?? null,
  };

  const save = (value: SlotValue) => {
    push({ kind, target, position, previous, label });
    startTransition(async () => {
      const result =
        kind === 'slot'
          ? await setSlotValue(target, position, value)
          : await setDefaultSlotValue(target, position, value);
      setError(result.ok ? undefined : (result.error ?? 'Save failed'));
    });
  };

  const onChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = event.target.value;
    if (selected === PLACEHOLDER_OPTION) {
      // Don't apply yet — collect the text in the popover first. (Also the
      // edit path when a label is already set, so this precedes the
      // no-change check.)
      event.target.value = current;
      setDraft(placeholder ?? 'CLOSED');
      setLabelOpen(true);
      return;
    }
    if (selected === current) return;
    save(selected === '' ? {} : { memberId: Number(selected) });
  };

  const closeLabel = () => {
    setLabelOpen(false);
    // return focus to the grid so Ctrl/Cmd+Z works immediately afterward
    setTimeout(() => selectRef.current?.focus(), 0);
  };

  const applyLabel = () => {
    const text = draft.trim();
    closeLabel();
    if (!text || text === placeholder) return;
    save({ placeholder: text });
  };

  return (
    <span className="relative inline-block">
      <select
        key={`${current}:${placeholder ?? ''}`}
        ref={selectRef}
        defaultValue={current}
        onChange={onChange}
        disabled={pending}
        aria-label={label}
        className={cn(
          'h-7 w-36 rounded-md border border-input bg-background px-1 text-xs',
          pending && 'opacity-60',
          placeholder && 'italic text-muted-foreground',
        )}
      >
        <option value="">— vacant —</option>
        <option value={PLACEHOLDER_OPTION}>
          {placeholder ? `${placeholder} (edit…)` : 'Label…'}
        </option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.lastName}, {m.firstName}
          </option>
        ))}
      </select>
      {labelOpen ? (
        <>
          {/* click-away backdrop */}
          <div className="fixed inset-0 z-40" onClick={closeLabel} />
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border bg-popover p-3 text-popover-foreground shadow-md">
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                applyLabel();
              }}
            >
          <label className="grid gap-1 text-xs text-muted-foreground">
            Slot label
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') closeLabel();
              }}
              placeholder="e.g. CLOSED"
              className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground not-italic"
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="h-6 text-xs">
              Apply
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={closeLabel}
            >
              Cancel
            </Button>
          </div>
            </form>
          </div>
        </>
      ) : null}
    </span>
  );
}
