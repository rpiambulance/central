'use client';

import { useState } from 'react';
import { COMMON_POSITIONS, formatPosition } from '@/lib/positions';

const OTHER = '__other__';

/**
 * Position picker for a crew row. The usual positions are offered by name,
 * with "Other…" revealing a free-text box for anything unusual — so ordinary
 * events get consistent, correctly-spelled positions without ruling out a
 * one-off. Either way the submitted field is `position-<index>`.
 */
export function PositionField({
  index,
  className,
}: {
  index: number;
  className: string;
}) {
  const [choice, setChoice] = useState('');
  const other = choice === OTHER;

  return (
    <span className="flex flex-wrap items-center gap-2">
      <select
        value={choice}
        onChange={(event) => setChoice(event.target.value)}
        // When "Other…" is showing, the text box carries the value instead.
        name={other ? undefined : `position-${index}`}
        aria-label={`Position ${index + 1}`}
        className={className}
      >
        <option value="">— none —</option>
        {COMMON_POSITIONS.map((position) => (
          <option key={position} value={position}>
            {formatPosition(position)}
          </option>
        ))}
        <option value={OTHER}>Other…</option>
      </select>
      {other ? (
        <input
          name={`position-${index}`}
          placeholder="Position name"
          autoFocus
          className={className}
        />
      ) : null}
    </span>
  );
}
