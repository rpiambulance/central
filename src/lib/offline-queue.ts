'use client';

/**
 * Writes that survive the venue's wifi.
 *
 * A supervisor logging an encounter from a concrete stairwell should not
 * lose it because the signal went. Every write goes through here: it is
 * attempted immediately, and if the attempt fails for a reason that looks
 * like the network rather than the request, it waits in the browser and is
 * retried when the connection comes back.
 *
 * Deliberately not a full offline-first store. Reads still need the network;
 * what is protected is the typing, which is the part that cannot be redone
 * from memory an hour later.
 */

const KEY = 'ems2.queue.v1';

export interface QueuedWrite {
  id: string;
  url: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** What to tell somebody is waiting, in their words rather than a URL. */
  label: string;
  queuedAt: number;
  attempts: number;
  lastError?: string;
}

type Listener = (queue: QueuedWrite[]) => void;
const listeners = new Set<Listener>();

const NOTHING: QueuedWrite[] = [];

/**
 * The queue, as a value that only changes when the queue does.
 *
 * useSyncExternalStore compares snapshots by identity, so handing it a
 * freshly parsed array every render would tell React the store had changed
 * on every render — which is an infinite loop rather than a badge.
 */
let cachedRaw: string | null = null;
let cached: QueuedWrite[] = NOTHING;

function read(): QueuedWrite[] {
  if (typeof window === 'undefined') return NOTHING;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // A private window, or storage turned off. Nothing queues; writes still
    // go straight out, which is the ordinary case anyway.
    return NOTHING;
  }
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    cached = raw ? (JSON.parse(raw) as QueuedWrite[]) : NOTHING;
  } catch {
    cached = NOTHING;
  }
  return cached;
}

function write(queue: QueuedWrite[]): void {
  try {
    const raw = JSON.stringify(queue);
    window.localStorage.setItem(KEY, raw);
    cachedRaw = raw;
    cached = queue;
  } catch {
    // Full or unavailable. Losing the queue is bad; throwing in the middle
    // of somebody's encounter is worse.
  }
  for (const listener of listeners) listener(queue);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function snapshot(): QueuedWrite[] {
  return read();
}

/**
 * Whether a failure is worth retrying.
 *
 * A 400 will fail the same way for ever and belongs in front of the person
 * who typed it. A dead connection, a 502 from a proxy, or a timeout is the
 * venue's wifi and belongs in the queue.
 */
export function isRetryable(status: number | null | undefined): boolean {
  // Anything that is not a status we recognise is treated as the network,
  // because the cost of being wrong runs one way: a retry is a duplicate
  // request, and discarding is somebody's encounter gone.
  if (typeof status !== 'number') return true;
  if (status === 408 || status === 429) return true;
  return status >= 500;
}

let flushing = false;

/**
 * Sends a write, queueing it if the network is the reason it failed.
 *
 * Returns the response when it went out, and null when it was queued —
 * callers show what they already know rather than waiting.
 */
export async function send(
  entry: Omit<QueuedWrite, 'id' | 'queuedAt' | 'attempts'>,
): Promise<Response | null> {
  // Anything already waiting goes first, or a correction could overtake the
  // thing it corrects.
  const pending = read();
  if (pending.length) {
    enqueue(entry);
    void flush();
    return null;
  }
  try {
    const res = await fetch(entry.url, {
      method: entry.method,
      headers: { 'Content-Type': 'application/json' },
      body: entry.body === undefined ? undefined : JSON.stringify(entry.body),
    });
    if (!res.ok && isRetryable(res.status)) {
      enqueue(entry, `${res.status}`);
      return null;
    }
    return res;
  } catch (error) {
    enqueue(entry, error instanceof Error ? error.message : 'offline');
    return null;
  }
}

function enqueue(
  entry: Omit<QueuedWrite, 'id' | 'queuedAt' | 'attempts'>,
  lastError?: string,
): void {
  const queue = read();
  queue.push({
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: Date.now(),
    attempts: 0,
    lastError,
  });
  write(queue);
}

/**
 * Tries everything waiting, oldest first, stopping at the first failure.
 *
 * In order and one at a time on purpose: these are edits to the same few
 * records, and replaying them out of order would produce a state nobody
 * typed.
 */
export async function flush(): Promise<{ sent: number; left: number }> {
  if (flushing || typeof window === 'undefined') {
    return { sent: 0, left: read().length };
  }
  flushing = true;
  let sent = 0;
  try {
    let queue = read();
    while (queue.length) {
      const [next, ...rest] = queue;
      let ok = false;
      try {
        const res = await fetch(next.url, {
          method: next.method,
          headers: { 'Content-Type': 'application/json' },
          body: next.body === undefined ? undefined : JSON.stringify(next.body),
        });
        // A request the server has rejected on its merits will be rejected
        // the same way for ever. Dropped from the queue and reported, rather
        // than blocking everything behind it until the tab is closed.
        ok = res.ok || !isRetryable(res.status);
        if (!ok) next.lastError = `${res.status}`;
      } catch (error) {
        next.lastError = error instanceof Error ? error.message : 'offline';
      }
      if (!ok) {
        next.attempts += 1;
        write([next, ...rest]);
        break;
      }
      sent += 1;
      queue = rest;
      write(queue);
    }
    return { sent, left: read().length };
  } finally {
    flushing = false;
  }
}

/** Starts retrying when the browser says the connection is back. */
export function watchConnection(): () => void {
  if (typeof window === 'undefined') return () => {};
  const retry = () => void flush();
  window.addEventListener('online', retry);
  const timer = setInterval(retry, 15_000);
  return () => {
    window.removeEventListener('online', retry);
    clearInterval(timer);
  };
}
