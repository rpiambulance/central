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
  onNote,
}: {
  entries: TimelineEntry[];
  hour12: boolean;
  /** Absent on a closed standby, where nothing more is being written. */
  onNote?: (text: string) => Promise<unknown>;
}) {
  const [all, setAll] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Most of a standby is not a patient — the crowd moved, a gate closed —
  // and the alternative to a box for it is somebody's memory a week later.
  const write = async () => {
    const said = note.trim();
    if (!said || !onNote) return;
    setSaving(true);
    try {
      setNote('');
      await onNote(said);
    } finally {
      setSaving(false);
    }
  };
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

      {onNote ? (
        <div className="flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void write();
              }
            }}
            maxLength={1000}
            placeholder="Something that happened…"
            className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
          />
          <Button
            size="sm"
            disabled={!note.trim() || saving}
            onClick={() => void write()}
          >
            Add a note
          </Button>
        </div>
      ) : null}

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
