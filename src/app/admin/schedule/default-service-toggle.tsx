'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { setDefaultOutOfService } from './actions';

/**
 * Whether the agency runs a crew on this weekday, as a standing arrangement.
 *
 * Closing a night asks for a reason first, because the reason is what shows
 * on the schedule and on the whiteboard, and "out of service" with no
 * explanation reads as a fault rather than as a decision. Putting one back is
 * one press: there is nothing to explain about running a crew.
 */
export function DefaultServiceToggle({
  weekday,
  weekdayName,
  closed,
}: {
  weekday: number;
  weekdayName: string;
  closed: { reason: string | null } | null;
}) {
  const [asking, setAsking] = useState(false);

  if (closed) {
    return (
      <form action={setDefaultOutOfService.bind(null, weekday, false)}>
        <p className="text-sm font-medium text-destructive">Out of service</p>
        {closed.reason ? (
          <p className="text-xs text-muted-foreground">{closed.reason}</p>
        ) : null}
        <Button
          type="submit"
          size="sm"
          variant="outline"
          className="mt-1 h-7 text-xs"
        >
          Put back in service
        </Button>
      </form>
    );
  }

  if (!asking) {
    return (
      <div>
        <p className="text-sm">In service</p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="mt-1 h-7 text-xs"
          onClick={() => setAsking(true)}
        >
          Take out of service
        </Button>
      </div>
    );
  }

  return (
    <form
      action={setDefaultOutOfService.bind(null, weekday, true)}
      className="grid gap-1"
    >
      <label className="text-xs text-muted-foreground">
        Why no crew on {weekdayName}s?
        <input
          name="reason"
          maxLength={200}
          placeholder="No crew scheduled"
          className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
        />
      </label>
      <div className="flex items-center gap-1">
        <Button type="submit" size="sm" className="h-7 text-xs">
          Take out of service
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => setAsking(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
