'use client';

import { useState } from 'react';

const inputCls =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';

/**
 * One row per event. Several can be submitted together — a season's home
 * games, say — and each becomes its own request so they can be staffed and
 * answered separately, while the requester fills their details in once.
 */
export function EventRows() {
  const [rows, setRows] = useState([0]);
  const [nextKey, setNextKey] = useState(1);

  return (
    <div className="space-y-4">
      {rows.map((key, index) => (
        <fieldset key={key} className="grid gap-3 rounded-md border p-3">
          <legend className="px-1 text-sm font-medium">
            Event {index + 1}
          </legend>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Date
              <input type="date" name={`event-date-${key}`} className={inputCls} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Location
              <input
                type="text"
                name={`event-location-${key}`}
                placeholder="e.g. Houston Field House"
                className={inputCls}
              />
            </label>
          </div>

          <label className="grid gap-1 text-sm font-medium">
            What do you need covered?
            <textarea
              name={`event-description-${key}`}
              required
              rows={3}
              placeholder="Start and end times, expected attendance, sport or activity, anything unusual."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>

          {rows.length > 1 ? (
            <div>
              <button
                type="button"
                onClick={() => setRows(rows.filter((r) => r !== key))}
                className="h-8 rounded-md border px-3 text-sm text-destructive hover:bg-destructive/10"
              >
                Remove this event
              </button>
            </div>
          ) : null}
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() => {
          setRows([...rows, nextKey]);
          setNextKey(nextKey + 1);
        }}
        className="h-9 rounded-md border px-3 text-sm hover:bg-muted"
      >
        + Add another event
      </button>
      <p className="text-xs text-muted-foreground">
        Requesting several games or dates at once? Add a row for each — your
        contact details are only needed once.
      </p>
    </div>
  );
}
