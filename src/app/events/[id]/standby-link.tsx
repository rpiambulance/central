'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

/**
 * Opening this event's standby, or going to the one it already has.
 *
 * Here as well as on the standby list because an event further back than the
 * list reaches is best opened from the event itself, which is where somebody
 * looking at an old event is already standing.
 */
export function StandbyLink({
  eventId,
  standbyId,
}: {
  eventId: number;
  standbyId: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (standbyId) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => router.push(`/standbys/${standbyId}`)}
      >
        Go to the standby
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await fetch('/standbys/relay', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                method: 'POST',
                path: '/v1/standbys',
                body: { eventId },
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
        }}
      >
        {busy ? 'Opening…' : 'Open a standby'}
      </Button>
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
    </>
  );
}
