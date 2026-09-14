'use client';

import { useId, useState } from 'react';

const FIELD = 'h-8 rounded-md border border-input bg-background px-2 text-sm';

export interface Choice {
  id: number;
  label: string;
}

/**
 * A box you type into, with what is already known offered as you type.
 *
 * A select is the wrong control for both of the places this is used. The
 * roster is the whole active membership, which is too long to scroll on a
 * phone at a gate; and a location may well not be one anybody set up — a
 * standby opened against an ad-hoc event has no venue at all, and a select
 * with nothing in it is a dead end rather than a prompt.
 *
 * Native datalist on purpose: the keyboard is the phone's own, the list is
 * the browser's, and nothing has to be scrolled inside a scrolling page.
 */
export function Picker({
  choices,
  value,
  placeholder,
  disabled,
  allowFreeText = false,
  className = '',
  onPick,
}: {
  choices: Choice[];
  /** What to show when nothing has been typed yet. */
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Whether something that matches nothing is still an answer. */
  allowFreeText?: boolean;
  className?: string;
  onPick: (picked: { id: number | null; text: string }) => void;
}) {
  const listId = useId();
  const [typed, setTyped] = useState(value ?? '');

  // The server is authoritative once it answers; without this the box keeps
  // what it started with after somebody else moves the unit.
  const [fromProps, setFromProps] = useState(value ?? '');
  if (fromProps !== (value ?? '')) {
    setFromProps(value ?? '');
    setTyped(value ?? '');
  }

  const settle = (text: string) => {
    const trimmed = text.trim();
    const match = choices.find(
      (choice) => choice.label.toLowerCase() === trimmed.toLowerCase(),
    );
    if (!trimmed) {
      onPick({ id: null, text: '' });
      return;
    }
    if (match) {
      onPick({ id: match.id, text: match.label });
      setTyped(match.label);
      return;
    }
    if (allowFreeText) {
      onPick({ id: null, text: trimmed });
      return;
    }
    // Not a name anybody knows, and nothing here accepts one. Put the box
    // back rather than leaving it looking as though it took.
    setTyped(fromProps);
  };

  return (
    <>
      <input
        list={listId}
        value={typed}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => setTyped(e.target.value)}
        // A datalist click fires change, not blur, on some browsers; both
        // settle, and settling twice is the same answer.
        onBlur={(e) => settle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            settle((e.target as HTMLInputElement).value);
          }
        }}
        className={`${FIELD} ${className}`}
      />
      <datalist id={listId}>
        {choices.map((choice) => (
          <option key={choice.id} value={choice.label} />
        ))}
      </datalist>
    </>
  );
}
