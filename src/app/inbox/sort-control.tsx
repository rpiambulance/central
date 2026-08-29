'use client';

import { useRef } from 'react';
import { saveInboxSort } from './actions';

/**
 * The inbox order, saved per member.
 *
 * Changing the select saves immediately rather than behind a button: the
 * whole point is that this is how the member's inbox looks from now on, and a
 * separate "save" invites the reading that it applies only to this visit.
 */
export function SortControl({
  options,
  current,
}: {
  options: Array<{ key: string; label: string }>;
  current: string;
}) {
  const form = useRef<HTMLFormElement>(null);

  return (
    <form action={saveInboxSort} ref={form} className="ml-auto">
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Sort
        <select
          name="sort"
          defaultValue={current}
          onChange={() => form.current?.requestSubmit()}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
        >
          {options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {/* Works without JavaScript too, and harmless with it. */}
      <noscript>
        <button type="submit" className="text-xs underline">
          Apply
        </button>
      </noscript>
    </form>
  );
}
