'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

/**
 * Opening a standby against an event on the calendar.
 *
 * Deliberately tied to an event rather than freestanding: the signups are
 * what seed the personnel list, and a standby with nobody on it is a form
 * somebody has to fill in by hand.
 */
export function OpenStandby({
  events,
}: {
  events: Array<{ id: number; title: string; startsAt: string }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState('');

  if (!events.length) return null;

  const open = async () => {
    if (!eventId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/standbys/relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'POST',
          path: '/v1/standbys',
          body: { eventId: Number(eventId) },
        }),
      });
      const body = (await res.json()) as { id?: number; message?: string };
      if (!res.ok || !body.id) {
        setError(body.message ?? 'Could not open it.');
        return;
      }
      router.push(`/standbys/${body.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
      <label className="grid gap-1 text-xs text-muted-foreground">
        Open a standby for
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="h-8 w-72 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Choose an event…</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
      </label>
      <Button type="button" size="sm" disabled={!eventId || busy} onClick={() => void open()}>
        {busy ? 'Opening…' : 'Open'}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
