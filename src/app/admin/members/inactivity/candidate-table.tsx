'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, formatPlainDate } from '@/lib/format';

export type Candidate = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  lastParticipation: string | null;
  joinedAfterCutoff: boolean;
};

export function CandidateTable({ candidates }: { candidates: Candidate[] }) {
  // Members who joined after the cutoff never had the chance to take part, so
  // they start unticked rather than hidden.
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(candidates.filter((c) => !c.joinedAfterCutoff).map((c) => c.id)),
  );
  const headerRef = useRef<HTMLInputElement>(null);

  const allSelected = selected.size === candidates.length;
  const someSelected = selected.size > 0 && !allSelected;

  // Indeterminate is a DOM property rather than an attribute, so React cannot
  // set it declaratively.
  useEffect(() => {
    if (headerRef.current) headerRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(candidates.map((c) => c.id)));
  };

  const toggle = (id: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const summary = useMemo(() => {
    if (selected.size === 0) return 'None selected';
    if (allSelected) return `All ${candidates.length} selected`;
    return `${selected.size} of ${candidates.length} selected`;
  }, [selected.size, allSelected, candidates.length]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button
          type="button"
          onClick={toggleAll}
          className="h-8 rounded-md border px-3 hover:bg-muted"
        >
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
        <span className="text-muted-foreground">{summary}</span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  ref={headerRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all members"
                  className="size-4"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Last participation</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((candidate) => (
              <TableRow key={candidate.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    name="memberIds"
                    value={candidate.id}
                    checked={selected.has(candidate.id)}
                    onChange={() => toggle(candidate.id)}
                    aria-label={`Deactivate ${candidate.firstName} ${candidate.lastName}`}
                    className="size-4"
                  />
                </TableCell>
                <TableCell className="font-medium whitespace-nowrap">
                  {candidate.lastName}, {candidate.firstName}
                  {candidate.joinedAfterCutoff ? (
                    <Badge variant="outline" className="ml-2 text-muted-foreground">
                      joined after cutoff
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {candidate.email}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {candidate.lastParticipation ? (
                    formatPlainDate(candidate.lastParticipation)
                  ) : (
                    <span className="text-muted-foreground">never</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDate(candidate.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
