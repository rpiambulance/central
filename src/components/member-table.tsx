'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCredKey } from '@/lib/format';
import {
  buildSatisfiedBy,
  summarizeCredentials,
  type LadderType,
} from '@/lib/credentials';

export type MemberRow = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string | null;
  active: boolean;
  nineHundredNumber: string | null;
  credentials: Array<{
    title: string | null;
    type: { key: string; name: string };
  }>;
};

export type CredentialType = LadderType & { id: number; name: string };

const ANY = '';
const NONE = '__none__';

const controlCls =
  'h-8 rounded-md border border-input bg-background px-2 text-sm';

type SortKey = 'lastName' | 'firstName' | 'nineHundredNumber';

/**
 * Compares one field, putting members who have no value last whichever way
 * the column is sorted.
 *
 * Reversing the sort should not drag everyone without a 900 number to the
 * top: the blanks are not the smallest value, they are the absence of one.
 */
function compare(a: MemberRow, b: MemberRow, key: SortKey): number {
  const left = (a[key] ?? '').toString();
  const right = (b[key] ?? '').toString();
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right, undefined, { numeric: true });
}

/** A header that sorts by its column, and says which way it is sorting. */
function SortableHead({
  label,
  column,
  sort,
  direction,
  onSort,
  className,
}: {
  label: string;
  column: SortKey;
  sort: SortKey;
  direction: 'asc' | 'desc';
  onSort: (column: SortKey) => void;
  className?: string;
}) {
  const active = sort === column;
  return (
    <TableHead
      className={className}
      aria-sort={
        active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'
      }
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        <span
          aria-hidden
          className={active ? 'text-foreground' : 'text-muted-foreground/40'}
        >
          {active && direction === 'desc' ? '↓' : '↑'}
        </span>
      </button>
    </TableHead>
  );
}

/** Matches a member against free text across the fields an admin would type. */
function matches(member: MemberRow, needle: string): boolean {
  if (!needle) return true;
  const haystack = [
    member.firstName,
    member.lastName,
    `${member.lastName}, ${member.firstName}`,
    `${member.firstName} ${member.lastName}`,
    member.email,
    member.cellPhone ?? '',
    member.nineHundredNumber ?? '',
    // Searching "CC" should find crew chiefs.
    ...member.credentials.map((c) => formatCredKey(c.type.key)),
    ...member.credentials.map((c) => c.type.name),
  ]
    .join(' ')
    .toLowerCase();
  return needle
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export function MemberTable({
  members,
  credentialTypes,
  showingInactive,
  linkProfiles = true,
}: {
  members: MemberRow[];
  credentialTypes: CredentialType[];
  showingInactive: boolean;
  /**
   * Whether a name opens the member's record. Off in the directory for
   * members who could not do anything once they got there.
   */
  linkProfiles?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [credential, setCredential] = useState(ANY);
  const [orAbove, setOrAbove] = useState(true);
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [withNumber, setWithNumber] = useState(false);
  const [sort, setSort] = useState<SortKey>('lastName');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');

  // Clicking the column already sorted turns it around; a different column
  // starts ascending, which is what "sort by this" means on first click.
  const sortBy = (column: SortKey) => {
    if (column === sort) {
      setDirection(direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(column);
      setDirection('asc');
    }
  };

  const satisfiedBy = useMemo(
    () => buildSatisfiedBy(credentialTypes),
    [credentialTypes],
  );

  const filtered = useMemo(() => {
    const rows = members.filter((member) => {
      if (!matches(member, query)) return false;
      if (status === 'active' && !member.active) return false;
      if (status === 'inactive' && member.active) return false;
      if (withNumber && !member.nineHundredNumber) return false;

      if (credential === ANY) return true;
      if (credential === NONE) return member.credentials.length === 0;

      const held = new Set(member.credentials.map((c) => c.type.key));
      if (!orAbove) return held.has(credential);
      // "or above": anything descending from the requirement counts.
      const satisfying = satisfiedBy.get(credential) ?? new Set([credential]);
      for (const key of held) if (satisfying.has(key)) return true;
      return false;
    });

    const ordered = [...rows].sort((a, b) => compare(a, b, sort));
    return direction === 'asc' ? ordered : ordered.reverse();
  }, [
    members,
    query,
    credential,
    orAbove,
    status,
    withNumber,
    sort,
    direction,
    satisfiedBy,
  ]);

  const filtering =
    query !== '' || credential !== ANY || status !== 'all' || withNumber;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Search
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, email, phone, credential…"
            className={`${controlCls} w-64`}
            aria-label="Search members"
          />
        </label>

        <label className="grid gap-1 text-xs text-muted-foreground">
          Credential
          <select
            value={credential}
            onChange={(event) => setCredential(event.target.value)}
            className={controlCls}
          >
            <option value={ANY}>Any</option>
            <option value={NONE}>None yet</option>
            {credentialTypes.map((type) => (
              <option key={type.id} value={type.key}>
                {formatCredKey(type.key)} — {type.name}
              </option>
            ))}
          </select>
        </label>

        <label
          className={`flex h-8 items-center gap-1.5 text-xs ${
            credential === ANY || credential === NONE
              ? 'text-muted-foreground/50'
              : 'text-muted-foreground'
          }`}
        >
          <input
            type="checkbox"
            checked={orAbove}
            disabled={credential === ANY || credential === NONE}
            onChange={(event) => setOrAbove(event.target.checked)}
            className="size-3.5"
          />
          or above
        </label>

        {/* A toggle rather than another dropdown: it is either on or off, and
            it is the filter most often reached for. */}
        <button
          type="button"
          onClick={() => setWithNumber(!withNumber)}
          aria-pressed={withNumber}
          className={`h-8 rounded-md border px-3 text-sm ${
            withNumber
              ? 'border-primary bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          }`}
        >
          Has a 900 number
        </button>

        {showingInactive ? (
          <label className="grid gap-1 text-xs text-muted-foreground">
            Status
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as 'all' | 'active' | 'inactive')
              }
              className={controlCls}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        ) : null}

        {filtering ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setCredential(ANY);
              setStatus('all');
              setWithNumber(false);
            }}
            className="h-8 rounded-md border px-3 text-sm hover:bg-muted"
          >
            Clear
          </button>
        ) : null}

        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {members.length}
        </span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                label="Name"
                column="lastName"
                sort={sort}
                direction={direction}
                onSort={sortBy}
              />
              <SortableHead
                label="First name"
                column="firstName"
                sort={sort}
                direction={direction}
                onSort={sortBy}
              />
              <SortableHead
                label="900"
                column="nineHundredNumber"
                sort={sort}
                direction={direction}
                onSort={sortBy}
              />
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Credentials</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No members match these filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {linkProfiles ? (
                      <Link
                        href={`/admin/members/${member.id}`}
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        {member.lastName}, {member.firstName}
                      </Link>
                    ) : (
                      <>
                        {member.lastName}, {member.firstName}
                      </>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {member.firstName}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {member.nineHundredNumber ? (
                      <Badge variant="secondary" className="font-mono tabular-nums">
                        {member.nineHundredNumber}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    {member.active ? (
                      <Badge>Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.credentials.length ? (
                        summarizeCredentials(member.credentials).map((badge) => (
                          <Badge
                            key={badge.key}
                            variant="secondary"
                            title={badge.tooltip}
                          >
                            {badge.label}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          None
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
