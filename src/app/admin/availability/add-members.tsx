'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { addPollMembers } from './actions';
import { displayName, surnameFirst } from '@/lib/name';

export type Candidate = { id: number; firstName: string; lastName: string };

/**
 * Adding people to a poll that has already gone out.
 *
 * Only people not already invited are on the list, so nobody can be asked
 * twice by accident — the API skips duplicates too, but a picker offering a
 * name that will be silently ignored is a picker that lies.
 */
export function AddPollMembers({
  pollId,
  candidates,
}: {
  pollId: number;
  candidates: Candidate[];
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return candidates;
    return candidates.filter((person) =>
      displayName(person).toLowerCase().includes(needle),
    );
  }, [candidates, query]);

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  if (!candidates.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Everybody active is already invited.
      </p>
    );
  }

  return (
    <form action={addPollMembers.bind(null, pollId)} className="grid gap-3">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name…"
        className="h-8 w-full max-w-xs rounded-md border border-input bg-background px-2 text-sm"
      />
      <div className="max-h-56 overflow-auto rounded-md border p-2">
        {shown.map((person) => (
          <label
            key={person.id}
            className="flex items-center gap-2 py-0.5 text-sm"
          >
            <input
              type="checkbox"
              name="memberIds"
              value={person.id}
              checked={selected.has(person.id)}
              onChange={() => toggle(person.id)}
            />
            {surnameFirst(person)}
          </label>
        ))}
        {!shown.length ? (
          <p className="py-1 text-sm text-muted-foreground">
            Nobody matches that.
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant="outline" disabled={!selected.size}>
          {selected.size
            ? `Add ${selected.size} ${selected.size === 1 ? 'person' : 'people'}`
            : 'Add to poll'}
        </Button>
        <span className="text-xs text-muted-foreground">
          They are asked for their availability the same way the others were.
        </span>
      </div>
    </form>
  );
}
