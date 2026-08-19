import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { prefers12Hour } from '@/lib/me';
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

type Dispatch = {
  id: number;
  receivedAt: string;
  determinant: string | null;
  complaint: string | null;
  location: string | null;
  business: string | null;
  additionalInfo: string | null;
  crossStreets: string | null;
  units: string | null;
  responseAreas: string | null;
};

const DETERMINANT_STYLE: Record<string, string> = {
  Alpha: '',
  Bravo: '',
  Charlie: 'bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-100',
  Delta: 'bg-red-200 text-red-950 dark:bg-red-900 dark:text-red-100',
  Echo: 'bg-red-200 text-red-950 dark:bg-red-900 dark:text-red-100',
};

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
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  const { q, from, to } = await searchParams;
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {dispatches.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(d.receivedAt, hour12)}
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
