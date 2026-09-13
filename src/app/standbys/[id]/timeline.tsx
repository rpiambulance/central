'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatDateTime, formatTime } from '@/lib/format';
import { displayName } from '@/lib/name';
import type { TimelineEntry } from './types';

/** How much of it is worth showing before somebody asks for the rest. */
const RECENT = 15;

/**
 * What has happened, most recent first.
 *
 * Newest at the top because on a running standby the question is what just
 * happened; the event report prints the same lines the other way up, which
 * is how a record is read afterwards.
 */
export function Timeline({
  entries,
  hour12,
}: {
  entries: TimelineEntry[];
  hour12: boolean;
}) {
  const [all, setAll] = useState(false);
  const newestFirst = [...entries].reverse();
  const shown = all ? newestFirst : newestFirst.slice(0, RECENT);
  const day = (iso: string) => iso.slice(0, 10);
  const oneDay = entries.length
    ? day(entries[0].at) === day(entries[entries.length - 1].at)
    : true;

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-lg font-medium tracking-tight">Timeline</h2>
        {entries.length > RECENT ? (
          <Button variant="ghost" size="sm" onClick={() => setAll((was) => !was)}>
            {all ? 'Show recent only' : `Show all ${entries.length}`}
          </Button>
        ) : null}
      </div>

      {shown.length ? (
        <ol className="divide-y rounded-md border">
          {shown.map((entry) => (
            <li key={entry.id} className="flex gap-3 px-3 py-1.5 text-sm">
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {oneDay ? formatTime(entry.at, hour12) : formatDateTime(entry.at, hour12)}
              </span>
              <span className="min-w-0 flex-1">
                {entry.text}
                {entry.actor ? (
                  <span className="text-muted-foreground">
                    {' '}
                    — {displayName(entry.actor)}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing has happened yet.</p>
      )}
    </section>
  );
}
