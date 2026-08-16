'use client';

import { useMemo, useState } from 'react';
import { formatCredKey } from '@/lib/format';
import { buildSatisfiedBy, type LadderType } from '@/lib/credentials';

export type InviteMember = {
  id: number;
  firstName: string;
  lastName: string;
  credentials?: Array<{ type: { key: string; name: string } }>;
};

export type CredentialType = LadderType & { id: number; name: string };

export function InvitePicker({
  members,
  credentialTypes,
}: {
  members: InviteMember[];
  credentialTypes: CredentialType[];
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [orAbove, setOrAbove] = useState(true);

  const satisfiedBy = useMemo(
    () => buildSatisfiedBy(credentialTypes),
    [credentialTypes],
  );

  /** Members who hold this credential, or something above it. */
  const holdersOf = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const type of credentialTypes) {
      const satisfying = satisfiedBy.get(type.key) ?? new Set([type.key]);
      const ids = members
        .filter((member) =>
          (member.credentials ?? []).some((c) =>
            orAbove ? satisfying.has(c.type.key) : c.type.key === type.key,
          ),
        )
        .map((member) => member.id);
      if (ids.length) map.set(type.key, ids);
    }
    return map;
  }, [members, credentialTypes, satisfiedBy, orAbove]);

  const toggle = (id: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /**
   * Adds everyone with the credential, or removes them if they are already
   * all in — so a chip both builds a selection up and takes it back out.
   */
  const toggleGroup = (ids: number[]) => {
    setSelected((current) => {
      const next = new Set(current);
      const allIn = ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allIn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">Invite members</span>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Quick select:</span>
        {credentialTypes
          .filter((type) => holdersOf.has(type.key))
          .map((type) => {
            const ids = holdersOf.get(type.key)!;
            const allIn = ids.every((id) => selected.has(id));
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => toggleGroup(ids)}
                title={`${type.name} — ${ids.length} member${ids.length === 1 ? '' : 's'}`}
                className={`h-7 rounded-md border px-2 text-xs ${
                  allIn
                    ? 'bg-secondary font-medium text-secondary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {formatCredKey(type.key)}
                <span className="ml-1 text-muted-foreground">{ids.length}</span>
              </button>
            );
          })}

        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={orAbove}
            onChange={(event) => setOrAbove(event.target.checked)}
            className="size-3.5"
          />
          or above
        </label>

        <button
          type="button"
          onClick={() => setSelected(new Set(members.map((m) => m.id)))}
          className="h-7 rounded-md border px-2 text-xs hover:bg-muted"
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setSelected(new Set())}
          className="h-7 rounded-md border px-2 text-xs hover:bg-muted"
        >
          None
        </button>
        <span className="ml-auto text-xs text-muted-foreground">
          {selected.size} of {members.length} invited
        </span>
      </div>

      <div className="grid max-h-72 gap-1 overflow-y-auto rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <label key={member.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="memberIds"
              value={member.id}
              checked={selected.has(member.id)}
              onChange={() => toggle(member.id)}
            />
            {member.lastName}, {member.firstName}
          </label>
        ))}
      </div>
    </div>
  );
}
