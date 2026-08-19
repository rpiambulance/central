'use client';

import { useState } from 'react';
import { setOutOfService } from './actions';

/**
 * Marks a night out of service, or puts it back.
 *
 * Taking a night out clears the crew, so it asks first and says what will
 * happen; putting it back is harmless and needs no ceremony. The duty
 * supervisor is left alone either way — that seat is changed on purpose or
 * not at all.
 */
export function OutOfServiceToggle({
  date,
  outOfService,
  reason,
}: {
  date: string;
  outOfService: boolean;
  reason: string | null;
}) {
  const [open, setOpen] = useState(false);

  if (outOfService) {
    return (
      <div className="mt-1 space-y-1">
        <p className="text-xs font-normal text-amber-700 dark:text-amber-500">
          Out of service{reason ? ` — ${reason}` : ''}
        </p>
        <form action={setOutOfService.bind(null, date, false)}>
          <button
            type="submit"
            className="text-xs font-normal text-muted-foreground underline underline-offset-2"
          >
            Put back in service
          </button>
        </form>
      </div>
    );
  }

  return open ? (
    <form
      action={setOutOfService.bind(null, date, true)}
      className="mt-1 space-y-1"
    >
      <input
        name="reason"
        placeholder="Why (optional)"
        className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs font-normal"
      />
      <div className="flex gap-2">
        <button
          type="submit"
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
        Clears everyone but the duty supervisor.
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
