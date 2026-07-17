'use client';

import { useTransition } from 'react';
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
 * "Label…" prompts for placeholder text (e.g. CLOSED).
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
      setError(result.ok ? undefined : result.error ?? 'Save failed');
    });
  };

  const onChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = event.target.value;
    if (selected === current) return;
    if (selected === PLACEHOLDER_OPTION) {
      const text = window.prompt('Placeholder text (e.g. CLOSED):', placeholder ?? 'CLOSED');
      if (!text?.trim()) {
        event.target.value = current; // user cancelled — restore
        return;
      }
      save({ placeholder: text.trim() });
      return;
    }
    save(selected === '' ? {} : { memberId: Number(selected) });
  };

  return (
    <select
      key={`${current}:${placeholder ?? ''}`}
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
      {placeholder ? (
        <option value={PLACEHOLDER_OPTION}>{placeholder}</option>
      ) : (
        <option value={PLACEHOLDER_OPTION}>Label…</option>
      )}
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.lastName}, {m.firstName}
        </option>
      ))}
    </select>
  );
}
