'use client';

import { useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { setDefaultSlotValue, setSlotValue, type SlotValue } from './actions';
import { useUndo } from './undo-context';
import { cn } from '@/lib/utils';
import { Option, SearchSelect } from '@/components/search-select';
import { displayName, surnameFirst } from '@/lib/name';

export interface SlotSelectProps {
  kind: 'slot' | 'default';
  target: number; // crewId or weekday
  position: string;
  label: string; // for the undo history, e.g. "Thu Jul 16 — Crew Chief"
  members: Array<{ id: number; firstName: string; lastName: string }>;
  memberId?: number | null;
  placeholder?: string | null;
  /**
   * The member currently in this slot when they are not among `members` —
   * inactive now, or lacking the position's credential. Kept as an option so
   * an existing assignment is shown as it stands rather than reading as
   * vacant, and is only lost if a scheduler actually changes it.
   */
  retained?: { id: number; name: string } | null;
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
  retained,
}: SlotSelectProps) {
  const { push, setError } = useUndo();
  const [pending, startTransition] = useTransition();
  const [labelOpen, setLabelOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  const closeLabel = () => {
    setLabelOpen(false);
    // return focus to the grid so Ctrl/Cmd+Z works immediately afterward
    setTimeout(() => triggerRef.current?.focus(), 0);
  };

  const applyLabel = () => {
    const text = draft.trim();
    closeLabel();
    if (!text || text === placeholder) return;
    save({ placeholder: text });
  };

  // What the trigger reads, and what a search matches against. Both name
  // forms, because an officer looking for "Casey" should not have to know
  // the list is filed by surname.
  const chosen = retained && retained.id === memberId ? retained : null;
  const inList = members.find((m) => m.id === memberId);
  const currentLabel = placeholder
    ? placeholder
    : inList
      ? surnameFirst(inList)
      : (chosen?.name ?? '— vacant —');

  const pick = (value: string) => {
    if (value === PLACEHOLDER_OPTION) {
      setDraft(placeholder ?? 'CLOSED');
      setLabelOpen(true);
      return;
    }
    if (value === current) return;
    save(value === '' ? {} : { memberId: Number(value) });
  };

  return (
    <span className="relative inline-block">
      {/* Same footprint as the select it replaced: a row of these sets the
          width of every column in the grid, so it cannot grow. */}
      <SearchSelect
        label={currentLabel}
        ariaLabel={label}
        disabled={pending}
        triggerClassName={cn(
          'h-7 w-36 px-1 text-xs',
          placeholder && 'italic text-muted-foreground',
          !placeholder && !inList && !chosen && 'text-muted-foreground',
        )}
        choices={members.map((m) => ({
          value: String(m.id),
          label: surnameFirst(m),
          // Both name forms, because an officer looking for "Casey" should
          // not have to know the list is filed by surname.
          aliases: [displayName(m)],
        }))}
        selected={current}
        emptyText="Nobody by that name."
        standing={
          <>
            {/* Not search results: clearing a slot is not a name. */}
            <Option onPick={() => pick('')} selected={current === ''}>
              — vacant —
            </Option>
            <Option
              onPick={() => pick(PLACEHOLDER_OPTION)}
              selected={current === PLACEHOLDER_OPTION}
            >
              {placeholder ? `${placeholder} (edit…)` : 'Label…'}
            </Option>
            {chosen ? (
              <Option onPick={() => pick(String(chosen.id))} selected>
                {chosen.name} (no longer eligible)
              </Option>
            ) : null}
          </>
        }
        onPick={pick}
      />
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
