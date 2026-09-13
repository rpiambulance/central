'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const FIELD = 'h-8 rounded-md border border-input bg-background px-2 text-sm';

export type OpenableEvent = {
  id: number;
  title: string;
  startsAt: string;
  kind: { name: string } | null;
};

/**
 * Opening a standby.
 *
 * Two ways in, because there are two situations. Usually the event is on the
 * calendar and the signups on it are what seed the personnel list. Sometimes
 * something happens that nobody planned, and then the event is made here —
 * a standby cannot float free of one, since run numbers tag to an event and
 * both exports read its title and kind.
 *
 * The list is future events without a standby already. Anything further back
 * is reached from the event itself, which is where somebody looking at an
 * old event is standing anyway.
 */
export function OpenStandby({
  events,
  kinds,
  mayCreateEvents,
}: {
  events: OpenableEvent[];
  kinds: Array<{ id: number; name: string }>;
  mayCreateEvents: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'calendar' | 'adhoc'>('calendar');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState('');
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [kindId, setKindId] = useState(String(kinds[0]?.id ?? ''));

  const open = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/standbys/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'POST', path: '/v1/standbys', body }),
      });
      const result = (await res.json()) as { id?: number; message?: string };
      if (!res.ok || !result.id) {
        setError(result.message ?? 'Could not open it.');
        return;
      }
      router.push(`/standbys/${result.id}`);
    } finally {
      setBusy(false);
    }
  };

  // The browser's offset, so a wall-clock time means the hour the person
  // typing it is in rather than whatever the server would assume.
  const offset = (() => {
    const minutes = -new Date().getTimezoneOffset();
    const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
    return `${minutes < 0 ? '-' : '+'}${pad(minutes / 60)}:${pad(minutes % 60)}`;
  })();

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">Open a standby</span>
        <div className="flex gap-1">
          {(
            [
              ['calendar', 'From the calendar'],
              ['adhoc', 'Not on the calendar'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              disabled={key === 'adhoc' && !mayCreateEvents}
              onClick={() => setMode(key)}
              title={
                key === 'adhoc' && !mayCreateEvents
                  ? 'Making an event needs events:create'
                  : undefined
              }
              className={`rounded-md border px-2 py-0.5 text-xs disabled:opacity-50 ${
                mode === key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'calendar' ? (
        events.length ? (
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Event
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className={`${FIELD} w-80`}
              >
                <option value="">Choose an event…</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {new Date(event.startsAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                    {' — '}
                    {event.title}
                    {event.kind ? ` (${event.kind.name})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              size="sm"
              disabled={!eventId || busy}
              onClick={() => void open({ eventId: Number(eventId) })}
            >
              {busy ? 'Opening…' : 'Open'}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No upcoming events without a standby. Open one from the event
            itself, or add an event that is not on the calendar.
          </p>
        )
      ) : (
        <div className="grid gap-2 sm:grid-cols-4">
          <label className="grid gap-1 text-xs text-muted-foreground sm:col-span-2">
            What happened
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Unplanned 5K on the quad"
              maxLength={200}
              className={FIELD}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Kind
            <select
              value={kindId}
              onChange={(e) => setKindId(e.target.value)}
              className={FIELD}
            >
              {kinds.map((kind) => (
                <option key={kind.id} value={kind.id}>
                  {kind.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Started
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className={FIELD}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Ended (or expected to)
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className={FIELD}
            />
          </label>
          <div className="flex items-end sm:col-span-4">
            <Button
              type="button"
              size="sm"
              disabled={!title.trim() || !startsAt || !endsAt || !kindId || busy}
              onClick={() =>
                void open({
                  event: {
                    title: title.trim(),
                    startsAt: `${startsAt}:00${offset}`,
                    endsAt: `${endsAt}:00${offset}`,
                    kindId: Number(kindId),
                  },
                })
              }
            >
              {busy ? 'Opening…' : 'Add the event and open'}
            </Button>
            <p className="ml-3 text-xs text-muted-foreground">
              It goes on the calendar too — an event that happened should be
              on it.
            </p>
          </div>
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
