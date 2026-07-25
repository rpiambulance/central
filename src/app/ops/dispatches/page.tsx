import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
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

export default async function DispatchesPage() {
  let dispatches: Dispatch[];
  try {
    dispatches = await api<Dispatch[]>('/v1/dispatches');
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
                    {formatDateTime(d.receivedAt)}
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
