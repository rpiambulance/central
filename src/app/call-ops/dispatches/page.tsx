import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { formatDateTime, formatTime } from '@/lib/format';
import { myPermissions, prefers12Hour } from '@/lib/me';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { ErrorBanner } from '@/components/error-banner';
import { displayName } from '@/lib/name';

import { AddDispatch } from './add-dispatch';

type Dispatch = {
  id: number;
  receivedAt: string;
  /** Set when somebody typed it in rather than Herald sending it. */
  enteredBy: {
    firstName: string;
    preferredFirstName?: string | null;
    lastName: string;
  } | null;
  determinant: string | null;
  complaint: string | null;
  location: string | null;
  business: string | null;
  additionalInfo: string | null;
  crossStreets: string | null;
  units: string | null;
  responseAreas: string | null;
  /** AIR: who was asked, and who said they were coming. */
  callout: {
    id: number;
    asked: boolean;
    responses: Array<{
      at: string;
      slackName: string | null;
      member: {
        id: number;
        firstName: string;
        preferredFirstName?: string | null;
        lastName: string;
      } | null;
    }>;
  } | null;
};

const DETERMINANT_STYLE: Record<string, string> = {
  Alpha: '',
  Bravo: '',
  Charlie: 'bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-100',
  Delta: 'bg-red-200 text-red-950 dark:bg-red-900 dark:text-red-100',
  Echo: 'bg-red-200 text-red-950 dark:bg-red-900 dark:text-red-100',
};

/**
 * Who turned out, from the page that asked them.
 *
 * Three different things, and they do not read the same: nobody was asked
 * because a crew was already on the road; somebody was asked and nobody
 * answered; or these people said they were coming. The first is not a
 * failure and should not look like one.
 */
function Responded({
  callout,
  hour12,
}: {
  callout: Dispatch['callout'];
  hour12: boolean;
}) {
  if (!callout) return <span className="text-muted-foreground">—</span>;
  if (!callout.asked) {
    return (
      <span className="text-xs text-muted-foreground">
        crew on, nobody asked
      </span>
    );
  }
  if (!callout.responses.length) {
    return <span className="text-xs text-muted-foreground">no answers</span>;
  }
  return (
    <ul className="space-y-0.5">
      {callout.responses.map((response, index) => (
        <li key={index} className="flex flex-wrap items-baseline gap-1">
          <span>
            {response.member
              ? displayName(response.member)
              : (response.slackName ?? 'Somebody')}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(response.at, hour12)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          The dispatch log requires additional permissions.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function DispatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string
    error?: string;
    added?: string;
  }>;
}) {
  const { q, from, to, error, added } = await searchParams;
  // Only offered to whoever could actually do it; the API enforces it too.
  const mayWrite = (await myPermissions()).has('dispatches:write');
  const query = new URLSearchParams();
  if (q?.trim()) query.set('q', q.trim());
  if (/^\d{4}-\d{2}-\d{2}$/.test(from ?? '')) query.set('from', from!);
  if (/^\d{4}-\d{2}-\d{2}$/.test(to ?? '')) query.set('to', to!);
  const filtering = [...query.keys()].length > 0;
  const hour12 = await prefers12Hour();
  let dispatches: Dispatch[];
  try {
    dispatches = await api<Dispatch[]>(
      `/v1/dispatches${query.toString() ? `?${query}` : ''}`,
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dispatch Log"
        description="Text-message dispatches ingested from Herald, newest first."
      />
      <ErrorBanner message={error} />
      {added ? (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          Added to the log, and counted on the board.
        </p>
      ) : null}
      {mayWrite ? <AddDispatch /> : null}

      <form
        method="get"
        className="flex flex-wrap items-end gap-2 rounded-md border p-3"
      >
        <label className="grid gap-1 text-xs text-muted-foreground">
          Search
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Complaint, location, unit…"
            className="h-8 w-64 rounded-md border border-input bg-background px-2 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          From
          <input
            type="date"
            name="from"
            defaultValue={from ?? ''}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          To
          <input
            type="date"
            name="to"
            defaultValue={to ?? ''}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="h-8 rounded-md border px-3 text-sm hover:bg-muted"
        >
          Filter
        </button>
        {filtering ? (
          <Link
            href="/call-ops/dispatches"
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Clear
          </Link>
        ) : null}
        <span className="ml-auto text-sm text-muted-foreground">
          {dispatches.length} shown
        </span>
      </form>
      {dispatches.length ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Received</TableHead>
                <TableHead>Call type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Cross streets</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Responded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dispatches.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(d.receivedAt, hour12)}
                    {/* Said plainly: a hand-written entry is somebody's
                        recollection, and a reader comparing the log against
                        a report should know which is which. */}
                    {d.enteredBy ? (
                      <span className="block text-xs text-muted-foreground">
                        entered by {displayName(d.enteredBy)}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {d.determinant ? (
                        <Badge
                          variant="secondary"
                          className={DETERMINANT_STYLE[d.determinant] ?? ''}
                        >
                          {d.determinant}
                        </Badge>
                      ) : null}
                      <span>{d.complaint ?? '—'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-sm">
                    {d.business ? (
                      <span className="font-medium">{d.business} — </span>
                    ) : null}
                    {d.location ?? '—'}
                    {d.additionalInfo ? (
                      <span className="block text-xs text-muted-foreground">
                        {d.additionalInfo}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.crossStreets ?? '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{d.units ?? '—'}</TableCell>
                  <TableCell className="max-w-xs text-sm">
                    <Responded callout={d.callout} hour12={hour12} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No dispatches recorded yet. Point Herald&apos;s HEADSUP_URL at
          <code className="mx-1">&lt;api&gt;/v1/herald</code> with a
          dispatches:ingest token to start logging.
        </p>
      )}
    </div>
  );
}
