'use client';

import { useState, useTransition } from 'react';
import { setServiceValue, type SlotValue } from './actions';
import { useUndo } from './undo-context';

/**
 * Marks a night out of service, or puts it back.
 *
 * Taking a night out clears the crew, so it asks first and says what will
 * happen; putting it back is harmless and needs no ceremony. The duty
 * supervisor is left alone either way — that seat is changed on purpose or
 * not at all.
 *
 * Both directions are undoable, and undoing an out-of-service puts the crew
 * back: the seats it cleared are recorded here on the way past, because the
 * server has no memory of who was in them.
 */
export function OutOfServiceToggle({
  date,
  crewId,
  outOfService,
  reason,
  crew,
  label,
}: {
  date: string;
  crewId: number;
  outOfService: boolean;
  reason: string | null;
  /** Who is in which seat right now, for putting them back. */
  crew: Array<{ position: string; value: SlotValue }>;
  label: string;
}) {
  const { push, setError } = useUndo();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const change = (next: boolean, nextReason?: string) => {
    push({
      kind: 'service',
      date,
      previous: { outOfService, reason },
      crew: crew.map((seat) => ({ crewId, ...seat })),
      label,
    });
    startTransition(async () => {
      const result = await setServiceValue(date, next, nextReason);
      setError(result.ok ? undefined : (result.error ?? 'Save failed'));
    });
    setOpen(false);
  };

  if (outOfService) {
    return (
      <div className="mt-1 space-y-1">
        <p className="text-xs font-normal text-amber-700 dark:text-amber-500">
          Out of service{reason ? ` — ${reason}` : ''}
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => change(false)}
          className="text-xs font-normal text-muted-foreground underline underline-offset-2"
        >
          Put back in service
        </button>
      </div>
    );
  }

  return open ? (
    <form
      className="mt-1 space-y-1"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        change(true, String(form.get('reason') ?? '').trim() || undefined);
      }}
    >
      <input
        name="reason"
        placeholder="Why (optional)"
        className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs font-normal"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="text-xs font-normal text-destructive underline underline-offset-2"
        >
          Take out of service
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-normal text-muted-foreground"
        >
          cancel
        </button>
      </div>
      <p className="text-[11px] font-normal text-muted-foreground">
        Clears everyone but the duty supervisor. Undo puts them back.
      </p>
    </form>
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="mt-1 block text-xs font-normal text-muted-foreground underline underline-offset-2"
    >
      Mark out of service
    </button>
  );
}
