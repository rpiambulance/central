'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Write = (
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body: unknown,
  label: string,
) => Promise<Response | null>;

/**
 * Finishing a standby, putting it back, or throwing it away.
 *
 * Closing says the record is complete and the exports can be taken from it.
 * It is not sealed — a county run number often turns up days later — so
 * reopening is one press and needs no ceremony.
 *
 * Discarding is for a standby opened against the wrong event, or an ad-hoc
 * event created by mistake. It asks first, and the API refuses outright once
 * there are encounters on it.
 */
export function StandbyActions({
  standbyId,
  closed,
  encounters,
  onWrite,
}: {
  standbyId: number;
  closed: boolean;
  encounters: number;
  onWrite: Write;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `/v1/standbys/${standbyId}`;

  const run = async (
    method: 'POST' | 'DELETE',
    path: string,
    label: string,
    after?: () => void,
  ) => {
    setBusy(true);
    setError(null);
    try {
      const res = await onWrite(method, path, undefined, label);
      if (res && !res.ok) {
        const body = (await res.json()) as { message?: string };
        setError(body.message ?? 'That did not work.');
        return;
      }
      after?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {closed ? (
          <>
            <span className="text-sm text-muted-foreground">
              Closed. Encounters can still be corrected.
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void run('POST', `${base}/reopen`, 'reopen the standby')}
            >
              Reopen
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void run('POST', `${base}/close`, 'close the standby')}
          >
            Close the standby
          </Button>
        )}

        {/* Only offered while there is nothing to lose. Once encounters
            exist the API refuses, and a button that always says no is worse
            than no button. */}
        {!encounters && !asking ? (
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Discard this standby
          </button>
        ) : null}
      </div>

      {asking ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">Throw this standby away?</p>
          <p className="mt-1">
            Its units and personnel go with it. The event stays on the
            calendar — only the standby opened against it is removed.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
              disabled={busy}
              onClick={() =>
                void run('DELETE', base, 'discard the standby', () =>
                  router.push('/standbys'),
                )
              }
            >
              Yes, discard it
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setAsking(false)}
            >
              Keep it
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
