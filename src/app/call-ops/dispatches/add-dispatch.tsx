'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { addDispatch } from './actions';

const FIELD =
  'h-8 w-full rounded-md border border-input bg-background px-2 text-sm';

const DETERMINANTS = ['', 'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Omega', 'Unknown'];

/**
 * Writing up a call Herald never delivered.
 *
 * Folded away, because the ordinary state of this page is reading the log —
 * a form sitting open above it would suggest entering calls by hand is the
 * normal way they arrive, and it is the exception.
 *
 * The time defaults to blank rather than to now: leaving it alone means "just
 * happened", and somebody backfilling last night's call is the one who should
 * have to say when.
 */
export function AddDispatch() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        Add a dispatch
      </Button>
    );
  }

  // The browser's offset, so a wall-clock time means the hour the person
  // typing it experienced rather than whatever the server would assume.
  const minutes = -new Date().getTimezoneOffset();
  const sign = minutes < 0 ? '-' : '+';
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const offset = `${sign}${pad(minutes / 60)}:${pad(minutes % 60)}`;

  return (
    <form action={addDispatch} className="grid gap-3 rounded-md border p-3">
      <input type="hidden" name="offset" value={offset} />
      <p className="text-sm font-medium">
        Add a dispatch
        <span className="ml-2 font-normal text-muted-foreground">
          for a call the feed missed. It counts on the board, but the screens
          in the bay are not interrupted.
        </span>
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Received (leave blank for now)
          <input type="datetime-local" name="receivedAt" className={FIELD} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Determinant
          <select name="determinant" defaultValue="" className={FIELD}>
            {DETERMINANTS.map((d) => (
              <option key={d} value={d}>
                {d || '—'}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Units
          <input name="units" placeholder="E59" maxLength={200} className={FIELD} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Call type
          <input
            name="complaint"
            placeholder="Sick person"
            maxLength={200}
            className={FIELD}
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Location
          <input
            name="location"
            placeholder="1999 Burdett Ave"
            maxLength={300}
            className={FIELD}
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Business
          <input name="business" maxLength={200} className={FIELD} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Cross streets
          <input name="crossStreets" maxLength={200} className={FIELD} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground sm:col-span-2">
          Anything else
          <input name="additionalInfo" maxLength={1000} className={FIELD} />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm">
          Add it
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
