'use client';

import Image from 'next/image';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { isNight } from '@/lib/sun';
import styles from './headsup.module.css';

export interface BoardSeat {
  position: string;
  title: string;
  name: string | null;
  number: string | null;
  vacant: boolean;
}

export interface Board {
  date: string;
  crew: BoardSeat[];
  outOfService: { reason: string | null } | null;
  calls: number;
  mishaps: number;
  chores: string[];
  notes: { id: number; body: string }[];
}

interface Dispatch {
  determinant: string | null;
  complaint: string | null;
  location: string | null;
  receivedAt: string;
}

function subscribeToClock(onTick: () => void) {
  const timer = setInterval(onTick, 1000);
  return () => clearInterval(timer);
}

/** Whole seconds, so the snapshot is stable between ticks. */
function secondsNow() {
  return Math.floor(Date.now() / 1000);
}

/** How long a dispatch holds the screen before the board comes back. */
const DISPATCH_MS = 5 * 60_000;

const DETERMINANT_CLASS: Record<string, string> = {
  alpha: styles.alpha,
  bravo: styles.bravo,
  charlie: styles.charlie,
  delta: styles.delta,
  echo: styles.echo,
};

function clock(now: Date) {
  return {
    date: now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
      timeZone: 'America/New_York',
    }),
    time: now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/New_York',
    }),
  };
}

/**
 * The whiteboard on the wall.
 *
 * Served with a board already on it, so a screen that comes up during a
 * network outage still shows the last thing known rather than a spinner
 * nobody is there to watch. After that it is pushed to: the API says what
 * moved, this fetches it. The clock ticks locally because a display that
 * needs the server to know the time is a display that shows the wrong time
 * whenever the server is busy.
 */
export function Display({
  initial,
  token,
}: {
  initial: Board;
  token: string;
}) {
  const [board, setBoard] = useState(initial);
  // The wall clock is an external source, not derived state: subscribing to
  // it keeps the server's second and the browser's from having to agree at
  // hydration, without a render-triggering write on mount. Whole seconds,
  // because a snapshot that changed every millisecond would never settle.
  const tick = useSyncExternalStore(subscribeToClock, secondsNow, () => 0);
  const now = tick ? new Date(tick * 1000) : null;
  const [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const [stale, setStale] = useState(false);
  const dispatchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/headsup/data?token=${encodeURIComponent(token)}`,
        { cache: 'no-store' },
      );
      if (!res.ok) return;
      setBoard((await res.json()) as Board);
      setStale(false);
    } catch {
      // Left showing the last good board: a stale crew list is worth more
      // than an empty one, and the banner says which it is.
      setStale(true);
    }
  }, [token]);


  useEffect(() => {
    const source = new EventSource(
      `/headsup/stream?token=${encodeURIComponent(token)}`,
    );
    source.addEventListener('board', () => void refresh());
    source.addEventListener('dispatch', (event) => {
      const detail = JSON.parse((event as MessageEvent).data) as Dispatch;
      if (dispatchTimer.current) clearTimeout(dispatchTimer.current);
      setDispatch(detail);
      dispatchTimer.current = setTimeout(
        () => setDispatch(null),
        DISPATCH_MS,
      );
    });
    source.onerror = () => setStale(true);
    source.onopen = () => setStale(false);
    return () => {
      source.close();
      if (dispatchTimer.current) clearTimeout(dispatchTimer.current);
    };
  }, [token, refresh]);

  // A belt-and-braces reread. The push is what makes it feel live; this is
  // what stops a screen sitting on yesterday's crew if it ever missed one.
  useEffect(() => {
    const timer = setInterval(() => void refresh(), 5 * 60_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const night = now ? isNight(now) : false;
  const shown = now ? clock(now) : null;

  if (dispatch) {
    const key = (dispatch.determinant ?? '').trim().toLowerCase();
    return (
      <div className={styles.dispatch} role="alert" aria-live="assertive">
        <div className={styles.dispatchTime}>
          Dispatched at{' '}
          {new Date(dispatch.receivedAt).toLocaleTimeString('en-GB', {
            hour12: false,
            timeZone: 'America/New_York',
          })}
        </div>
        {dispatch.determinant ? (
          <div
            className={`${styles.determinant} ${DETERMINANT_CLASS[key] ?? ''}`}
          >
            {dispatch.determinant}
          </div>
        ) : null}
        {dispatch.complaint ? (
          <div className={styles.complaint}>{dispatch.complaint}</div>
        ) : null}
        {dispatch.location ? (
          <div className={styles.location}>{dispatch.location}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.headsup} data-night={night}>
      <header className={styles.header}>
        <Image
          src="/rpia-patch.svg"
          alt=""
          width={60}
          height={64}
          priority
          unoptimized
        />
        <span>RPI Ambulance</span>
        <div className={styles.datetime}>
          {/* Rendered only once the client has a clock, so the server's
              second and the browser's never disagree on screen. */}
          <b>{shown?.date ?? ''}</b>
          <span className={styles.time}>{shown?.time ?? ''}</span>
          {/* Said plainly rather than hidden: a board quietly showing an
              hour-old crew is worse than one admitting it is offline. */}
          {stale ? <span className={styles.stale}>offline</span> : null}
        </div>
      </header>

      {board.outOfService ? (
        <div className={styles.outOfService}>
          Out of service
          {board.outOfService.reason ? ` — ${board.outOfService.reason}` : ''}
        </div>
      ) : null}

      <div className={styles.body}>
        <div className={styles.columns}>
          <div className={styles.section}>
            <div className={styles.sectionHeading}>Today&apos;s crew</div>
            {board.crew.map((seat) => (
              <div key={seat.position} className={styles.crewMember}>
                <span className={styles.crewTitle}>{seat.title}</span>
                {seat.vacant ? (
                  <span className={styles.vacant}>vacant</span>
                ) : (
                  <>
                    <span className={styles.crewName}>{seat.name}</span>
                    {seat.number ? (
                      <span className={styles.crewNumber}>{seat.number}</span>
                    ) : null}
                  </>
                )}
              </div>
            ))}
          </div>

          <div className={`${styles.section} ${styles.counts}`}>
            <div className={styles.sectionHeading}>Calls to date</div>
            <div className={styles.callCount}>{board.calls}</div>
            <hr className={styles.rule} />
            <div className={styles.sectionHeading}>Dispatch mishaps</div>
            <div className={styles.mishapCount}>{board.mishaps}</div>
          </div>
        </div>

        <hr className={styles.rule} />

        <div className={styles.lower}>
          <div>
            <div className={styles.sectionHeading}>Chores</div>
            <div className={styles.chores}>
              {board.chores.length ? (
                <ul>
                  {board.chores.map((chore) => (
                    <li key={chore}>{chore}</li>
                  ))}
                </ul>
              ) : (
                <span>No chores tonight!</span>
              )}
            </div>
          </div>
          <div>
            <div className={styles.sectionHeading}>Notes</div>
            <div className={styles.notes}>
              {board.notes.map((note) => (
                <p key={note.id}>{note.body}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
