'use client';

import { useState } from 'react';

/** A new event lasts this long until somebody says otherwise. */
const DEFAULT_LENGTH_MS = 60 * 60 * 1000;

/**
 * A datetime-local value as a number, read as if it were UTC.
 *
 * The inputs hold wall time with no zone, and the arithmetic here is wall
 * time too: an event moved from 7pm to 8pm should still end an hour later on
 * the clock, whatever a DST change in between does to the elapsed time.
 * Reading both ends the same way makes the zone cancel out.
 */
function wallMs(value: string): number | null {
  const ms = Date.parse(`${value}Z`);
  return Number.isNaN(ms) ? null : ms;
}

/** Back to what a datetime-local input takes: "2026-11-05T19:00". */
function wallValue(ms: number): string {
  return new Date(ms).toISOString().slice(0, 16);
}

/**
 * The start and end of a new event, kept in step.
 *
 * Picking a start fills the end in an hour later, and moving the start moves
 * the end by the same amount — so an event set to run 7–9 and then moved to
 * 8 runs 8–10, not 8–9 or, worse, ending before it starts. The end can still
 * be set to anything by hand, and that length is what later moves keep.
 *
 * Submits as `startsAt` and `endsAt`, like the plain inputs it replaces.
 */
export function EventTimes({
  className,
  labelClassName,
}: {
  className: string;
  labelClassName: string;
}) {
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  function changeStart(next: string) {
    const before = wallMs(startsAt);
    const after = wallMs(next);
    const end = wallMs(endsAt);
    setStartsAt(next);
    if (after === null) return;
    if (end === null || before === null) {
      // Nothing to keep yet: the start was just picked, or the end is blank.
      setEndsAt(wallValue(after + DEFAULT_LENGTH_MS));
    } else {
      setEndsAt(wallValue(end + (after - before)));
    }
  }

  return (
    <>
      <label className={labelClassName}>
        Starts
        <input
          name="startsAt"
          type="datetime-local"
          required
          value={startsAt}
          onChange={(event) => changeStart(event.target.value)}
          className={className}
        />
      </label>
      <label className={labelClassName}>
        Ends
        <input
          name="endsAt"
          type="datetime-local"
          required
          value={endsAt}
          min={startsAt || undefined}
          onChange={(event) => setEndsAt(event.target.value)}
          className={className}
        />
      </label>
    </>
  );
}
