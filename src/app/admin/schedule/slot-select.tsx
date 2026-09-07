'use client';

import { useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { setDefaultSlotValue, setSlotValue, type SlotValue } from './actions';
import { useUndo } from './undo-context';
import { cn } from '@/lib/utils';
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

/** One choice in the list. A button so a click lands the same way a tap does. */
function Option({
  onPick,
  selected,
  children,
}: {
  onPick: () => void;
  selected?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={selected}
        onClick={onPick}
        className={cn(
          'w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-accent hover:text-accent-foreground',
          selected && 'bg-accent/60 font-medium',
        )}
      >
        {children}
      </button>
    </li>
  );
}

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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
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

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? members.filter((m) =>
        [surnameFirst(m), displayName(m)].some((name) =>
          name.toLowerCase().includes(needle),
        ),
      )
    : members;

  const pick = (value: string) => {
    setOpen(false);
    setQuery('');
    if (value === PLACEHOLDER_OPTION) {
      setDraft(placeholder ?? 'CLOSED');
      setLabelOpen(true);
      return;
    }
    if (value === current) return;
    save(value === '' ? {} : { memberId: Number(value) });
  };

  const closeList = () => {
    setOpen(false);
    setQuery('');
    setTimeout(() => triggerRef.current?.focus(), 0);
  };

  return (
    <span className="relative inline-block">
      {/* Same footprint as the select it replaces: a row of these sets the
          width of every column in the grid, so it cannot grow. */}
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((was) => !was)}
        disabled={pending}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'h-7 w-36 truncate rounded-md border border-input bg-background px-1 text-left text-xs',
          pending && 'opacity-60',
          placeholder && 'italic text-muted-foreground',
          !placeholder && !inList && !chosen && 'text-muted-foreground',
        )}
      >
        {currentLabel}
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={closeList} />
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') closeList();
                // Enter takes the only sensible thing: the single match, or
                // the first of several. Typing three letters and pressing
                // return is how this gets used at speed.
                if (event.key === 'Enter' && matches.length) {
                  event.preventDefault();
                  pick(String(matches[0].id));
                }
              }}
              placeholder="Search…"
              className="mb-1 h-7 w-full rounded-md border border-input bg-background px-2 text-xs"
            />
            <ul role="listbox" className="max-h-56 overflow-y-auto">
              {/* The two standing choices stay put rather than being
                  filtered away — clearing a slot is not a search result. */}
              {needle ? null : (
                <>
                  <Option onPick={() => pick('')} selected={current === ''}>
                    — vacant —
                  </Option>
                  <Option
                    onPick={() => pick(PLACEHOLDER_OPTION)}
                    selected={current === PLACEHOLDER_OPTION}
                  >
                    {placeholder ? `${placeholder} (edit…)` : 'Label…'}
                  </Option>
                </>
              )}
              {chosen && !needle ? (
                <Option onPick={() => pick(String(chosen.id))} selected>
                  {chosen.name} (no longer eligible)
                </Option>
              ) : null}
              {matches.map((m) => (
                <Option
                  key={m.id}
                  onPick={() => pick(String(m.id))}
                  selected={m.id === memberId}
                >
                  {surnameFirst(m)}
                </Option>
              ))}
              {needle && !matches.length ? (
                <li className="px-2 py-1 text-xs text-muted-foreground">
                  Nobody by that name.
                </li>
              ) : null}
            </ul>
          </div>
        </>
      ) : null}
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
