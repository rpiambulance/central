'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface SearchChoice {
  /** Carried back to the caller untouched, so ids and free text can share. */
  value: string;
  label: string;
  /** Other spellings a search should match — a preferred name, a venue. */
  aliases?: string[];
}

/** One choice in the list. A button so a click lands the same way a tap does. */
export function Option({
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
 * A trigger the size of the field it replaces, opening a search box above
 * the same choices.
 *
 * Written for the night crew grid, where the list is the whole active roster
 * and a table cell is no place to scroll one. Everywhere else that grew a
 * long list — who is on a standby, where a unit is — uses it rather than a
 * second thing that looks nearly the same.
 *
 * Typing filters; Enter takes the first match, which is how three letters
 * and a return become a choice at speed; Escape closes and gives the trigger
 * its focus back.
 */
export function SearchSelect({
  label,
  choices,
  onPick,
  selected,
  disabled,
  triggerClassName,
  popoverClassName,
  ariaLabel,
  searchPlaceholder = 'Search…',
  emptyText = 'Nothing by that name.',
  standing,
  onFreeText,
}: {
  /** What the trigger reads right now. */
  label: React.ReactNode;
  choices: SearchChoice[];
  onPick: (value: string) => void;
  selected?: string;
  disabled?: boolean;
  triggerClassName?: string;
  popoverClassName?: string;
  ariaLabel?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Choices that are not search results — "vacant", "label…". */
  standing?: React.ReactNode;
  /**
   * Given when something that matches nothing is still an answer: a place
   * nobody has set up is still a place. Offered as the first row so it is
   * pressed deliberately rather than fallen into.
   */
  onFreeText?: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? choices.filter((choice) =>
        [choice.label, ...(choice.aliases ?? [])].some((name) =>
          name.toLowerCase().includes(needle),
        ),
      )
    : choices;

  const close = () => {
    setOpen(false);
    setQuery('');
    setTimeout(() => triggerRef.current?.focus(), 0);
  };

  const pick = (value: string) => {
    close();
    onPick(value);
  };

  const takeTyped = () => {
    const typed = query.trim();
    if (!typed || !onFreeText) return;
    close();
    onFreeText(typed);
  };

  return (
    <span className="relative inline-block">
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((was) => !was)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'truncate rounded-md border border-input bg-background text-left',
          disabled && 'opacity-60',
          triggerClassName,
        )}
      >
        {label}
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div
            className={cn(
              'absolute left-0 top-full z-50 mt-1 w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
              popoverClassName,
            )}
          >
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') close();
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (matches.length) pick(matches[0].value);
                  else takeTyped();
                }
              }}
              placeholder={searchPlaceholder}
              className="mb-1 h-7 w-full rounded-md border border-input bg-background px-2 text-xs"
            />
            <ul role="listbox" className="max-h-56 overflow-y-auto">
              {needle ? null : standing}
              {onFreeText && needle && !matches.some((m) => m.label.toLowerCase() === needle) ? (
                <Option onPick={takeTyped}>Use “{query.trim()}”</Option>
              ) : null}
              {matches.map((choice) => (
                <Option
                  key={choice.value}
                  onPick={() => pick(choice.value)}
                  selected={choice.value === selected}
                >
                  {choice.label}
                </Option>
              ))}
              {needle && !matches.length && !onFreeText ? (
                <li className="px-2 py-1 text-xs text-muted-foreground">
                  {emptyText}
                </li>
              ) : null}
            </ul>
          </div>
        </>
      ) : null}
    </span>
  );
}
