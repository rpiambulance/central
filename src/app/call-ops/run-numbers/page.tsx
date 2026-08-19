import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { myPermissions, prefers12Hour } from '@/lib/me';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
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
import { ErrorBanner } from '@/components/error-banner';
import { PageHeader } from '@/components/page-header';
import { issueRunNumber, reopenChangeover, saveLocation } from './actions';

type Location = {
  id: number;
  name: string;
  abbr: string;
  active: boolean;
  nextRun: number;
};

type RunNumber = {
  id: number;
  number: string;
  note: string | null;
  issuedAt: string;
  location: { abbr: string; name: string };
  issuedBy: { id: number; firstName: string; lastName: string } | null;
  event: { id: number; title: string } | null;
};

type Payload = {
  term: {
    year: string;
    division: string | null;
    options: string[] | null;
    /** Names the changeover this month was settled in, if it was. */
    settledBy: string | null;
  };
  locations: Location[];
  recent: RunNumber[];
};

const FIELD = 'h-9 rounded-md border border-input bg-background px-2 text-sm';

export const dynamic = 'force-dynamic';

export default async function RunNumbersPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    issued?: string;
    reopened?: string;
  }>;
}) {
  const { error, issued, reopened } = await searchParams;
  const [data, permissions, hour12] = await Promise.all([
    api<Payload>('/v1/run-numbers'),
    myPermissions(),
    prefers12Hour(),
  ]);
  const canManage = permissions.has('run-numbers:manage');
  let locations: Location[] = data.locations;
  if (canManage) {
    locations = await api<Location[]>('/v1/run-numbers/locations');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Run Numbers"
        description="Take the next number for a standby, and see what has been issued."
      />
      <ErrorBanner message={error} />
      {reopened ? (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          Reopened. This month asks again.
        </p>
      ) : null}

      {issued ? (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">Your run number</CardTitle>
            <CardDescription>Write this on the report.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-3xl tracking-tight tabular-nums">
              {issued}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Take a number</CardTitle>
          <CardDescription>
            {data.term.settledBy
              ? `This month straddles two terms, and ${data.term.division}${data.term.year} has been chosen for it.`
              : data.term.division
                ? `Currently issuing ${data.term.division}${data.term.year} numbers.`
                : `This month could be either term, so say which — ${(data.term.options ?? []).join(' or ')}. Picking the term that is ending leaves the question open; picking the one beginning settles it for everyone after.`}{' '}
            Each location counts on its own, and every number is recorded
            against whoever took it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={issueRunNumber} className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Location
              <select name="locationId" required className={`${FIELD} w-64`}>
                {data.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.abbr} — {location.name}
                  </option>
                ))}
              </select>
            </label>
            {data.term.division ? null : (
              <label className="grid gap-1 text-xs text-muted-foreground">
                Term
                <select name="division" required className={FIELD}>
                  {(data.term.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="grid gap-1 text-xs text-muted-foreground">
              What for (optional)
              <input
                name="note"
                placeholder="Hockey vs. Union"
                className={`${FIELD} w-64`}
              />
            </label>
            <Button type="submit">Take the next number</Button>
          </form>
          {data.locations.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No locations are set up yet.
            </p>
          ) : null}
          {/* Settling a changeover is one-way for everyone else, so undoing an
              early pick is deliberately somebody's decision rather than the
              next person quietly choosing again. */}
          {canManage && data.term.settledBy ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Chosen too early?
              </summary>
              <form action={reopenChangeover} className="mt-2">
                <Button type="submit" size="sm" variant="outline">
                  Ask again this month
                </Button>
              </form>
            </details>
          ) : null}
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="text-lg font-medium tracking-tight">Recently issued</h2>
        {data.recent.length ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>What for</TableHead>
                  <TableHead>Taken by</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-mono whitespace-nowrap">
                      {run.number}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {run.location.name}
                    </TableCell>
                    <TableCell>
                      {run.note ?? (
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {run.issuedBy
                        ? `${run.issuedBy.firstName} ${run.issuedBy.lastName}`
                        : '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(run.issuedAt, hour12)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing has been issued yet.
          </p>
        )}
      </section>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Locations</CardTitle>
            <CardDescription>
              The abbreviation is the first part of every number issued there,
              so changing it changes what future numbers look like. Winding a
              counter back can produce a number that has already been used —
              the save is refused if it has.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {locations.map((location) => (
              <form
                key={location.id}
                action={saveLocation}
                className="flex flex-wrap items-end gap-2 border-b pb-3 last:border-b-0"
              >
                <input type="hidden" name="id" value={location.id} />
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Name
                  <input
                    name="name"
                    defaultValue={location.name}
                    required
                    className={`${FIELD} w-56`}
                  />
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Abbreviation
                  <input
                    name="abbr"
                    defaultValue={location.abbr}
                    required
                    className={`${FIELD} w-28 uppercase`}
                  />
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Next run
                  <input
                    name="nextRun"
                    type="number"
                    min={1}
                    defaultValue={location.nextRun}
                    className={`${FIELD} w-24`}
                  />
                </label>
                <label className="flex h-9 items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={location.active}
                    className="size-3.5"
                  />
                  In use
                </label>
                <Button type="submit" size="sm" variant="outline">
                  Save
                </Button>
                {location.active ? null : <Badge variant="secondary">Retired</Badge>}
              </form>
            ))}

            <form action={saveLocation} className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-xs text-muted-foreground">
                New location
                <input
                  name="name"
                  required
                  placeholder="Houston Field House"
                  className={`${FIELD} w-56`}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Abbreviation
                <input
                  name="abbr"
                  required
                  placeholder="HFH"
                  className={`${FIELD} w-28 uppercase`}
                />
              </label>
              <input type="hidden" name="active" value="on" />
              <Button type="submit" size="sm">
                Add
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
