'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { resetCounter } from './actions';

/**
 * Clearing a number on the board, with the question asked first.
 *
 * The count is the season, and somebody walking past the admin page should
 * not be able to end it with one stray click. The confirmation says what the
 * number is now and that the calls themselves survive it, because the fear
 * that stops people using this is that it deletes something.
 */
export function ResetCounter({
  counter,
  label,
  current,
}: {
  counter: 'calls' | 'mishaps';
  label: string;
  current: number;
}) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={() => setAsking(true)}
      >
        Start again
      </Button>
    );
  }

  return (
    <form
      action={resetCounter.bind(null, counter)}
      className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
    >
      <p className="font-medium">
        Start the {label.toLowerCase()} count again?
      </p>
      <p className="mt-1">
        It reads {current} now, and will read 0 on every display. Nothing is
        deleted — the {counter === 'calls' ? 'dispatches' : 'mishaps'} are all
        still recorded, and this point is kept so the {current} can still be
        answered for later.
      </p>
      <input type="hidden" name="confirm" value="yes" />
      <div className="mt-2 flex items-center gap-2">
        <Button type="submit" size="sm" variant="destructive" className="h-7 text-xs">
          Yes, start again
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => setAsking(false)}
        >
          Leave it
        </Button>
      </div>
    </form>
  );
}
