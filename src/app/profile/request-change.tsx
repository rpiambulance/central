'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { requestProfileChange } from './actions';

export type PendingChange = {
  id: number;
  field: string;
  requestedValue: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
};

const FIELDS = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'email', label: 'Portal email' },
] as const;

const FIELD =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';

/**
 * Asking for one of the locked fields to be changed.
 *
 * Folded away until wanted, because most people never need it and a form
 * sitting open under three grayed-out boxes reads as though they were meant
 * to fill it in. A request already waiting is shown instead of the form —
 * asking twice for the same thing makes two tasks and one confused officer.
 */
export function RequestChange({ pending }: { pending: PendingChange[] }) {
  const [open, setOpen] = useState(false);
  const waiting = pending.filter((row) => row.status === 'PENDING');

  if (waiting.length) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <p className="font-medium">Waiting on an officer</p>
        <ul className="mt-1 space-y-0.5">
          {waiting.map((row) => (
            <li key={row.id}>
              {FIELDS.find((field) => field.key === row.field)?.label ??
                row.field}{' '}
              → {row.requestedValue}
            </li>
          ))}
        </ul>
        <p className="mt-1">You will hear back here when it is decided.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={() => setOpen(true)}
      >
        Ask for one of these to be changed
      </Button>
    );
  }

  return (
    <form action={requestProfileChange} className="grid gap-2 rounded-md border p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Which
          <select name="field" defaultValue="firstName" className={`${FIELD} w-40`}>
            {FIELDS.map((field) => (
              <option key={field.key} value={field.key}>
                {field.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Should be
          <input name="requestedValue" required className={`${FIELD} w-56`} />
        </label>
      </div>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Why (optional)
        <input
          name="reason"
          placeholder="Married last month"
          className={FIELD}
        />
      </label>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm">
          Send request
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
