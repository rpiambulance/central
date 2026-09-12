'use client';

import { useEffect, useSyncExternalStore } from 'react';
import {
  flush,
  snapshot,
  subscribe,
  watchConnection,
  type QueuedWrite,
} from '@/lib/offline-queue';

const EMPTY: QueuedWrite[] = [];

/**
 * What is waiting to reach the server.
 *
 * Shown only when there is something, because the ordinary state is nothing
 * and a permanent "0 pending" badge teaches people to stop reading it. When
 * it does appear it says what is held, so somebody can decide whether to go
 * and stand somewhere with a signal.
 */
export function QueueStatus() {
  const queue = useSyncExternalStore(
    subscribe,
    snapshot,
    () => EMPTY,
  );

  useEffect(() => watchConnection(), []);

  if (!queue.length) return null;
  const oldest = queue[0];

  return (
    <div
      role="status"
      className="sticky top-0 z-20 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
    >
      <p className="font-medium">
        {queue.length} {queue.length === 1 ? 'change is' : 'changes are'} waiting
        to save
      </p>
      <p className="text-xs">
        Nothing is lost — they go up when the connection comes back. Oldest:{' '}
        {oldest.label}
        {oldest.lastError ? ` (${oldest.lastError})` : ''}.
      </p>
      <button
        type="button"
        onClick={() => void flush()}
        className="mt-1 rounded-md border border-amber-400 px-2 py-0.5 text-xs hover:bg-amber-100 dark:hover:bg-amber-900"
      >
        Try now
      </button>
    </div>
  );
}
