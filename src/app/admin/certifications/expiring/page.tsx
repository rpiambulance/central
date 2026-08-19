import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { formatDateOnly } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
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
import { PageHeader } from '@/components/page-header';
import { CertificationTabs } from '../tabs';

type Expiring = {
  id: number;
  expiresAt: string | null;
  identifier: string | null;
  type: { id: number; name: string };
  member: { id: number; firstName: string; lastName: string; email: string };
};

const WINDOWS = [30, 60, 90, 180];

// Expiry is relative to now; never serve this from a cache.
export const dynamic = 'force-dynamic';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Viewing expiring certifications requires the
          <code className="mx-1">certs:read-all</code> permission.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

/** Whole days from today to a date, in America/New_York. */
function daysUntil(iso: string): number {
  const today = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/New_York',
  }).format(new Date());
  return Math.round(
    (Date.parse(iso.slice(0, 10)) - Date.parse(today)) / 86_400_000,
  );
}

export default async function ExpiringCertificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ within?: string }>;
}) {
  const { within } = await searchParams;
  const days = WINDOWS.includes(Number(within)) ? Number(within) : 30;

  let rows: Expiring[];
  try {
    rows = await api<Expiring[]>(
      `/v1/certifications/expiring?withinDays=${days}`,
      { raw: true },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return <NoAccess />;
    throw error;
  }

  const lapsed = rows.filter((r) => r.expiresAt && daysUntil(r.expiresAt) < 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expiring certifications"
        description="Verified certifications that have lapsed or are about to, for active members."
      />
      <CertificationTabs active="expiring" />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted-foreground">Within</span>
        {WINDOWS.map((window) => (
          <Link
            key={window}
            href={`/admin/certifications/expiring?within=${window}`}
            className={
              window === days
                ? 'rounded-md bg-secondary px-3 py-1 font-medium text-secondary-foreground'
                : 'rounded-md px-3 py-1 text-muted-foreground hover:text-foreground'
            }
          >
            {window} days
          </Link>
        ))}
        <span className="ml-auto text-muted-foreground">
          {rows.length} total
          {lapsed.length ? ` · ${lapsed.length} already lapsed` : ''}
        </span>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nothing expires in the next {days} days.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Certification</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const remaining = row.expiresAt ? daysUntil(row.expiresAt) : null;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      <Link
                        href={`/admin/members/${row.member.id}`}
                        className="underline underline-offset-2"
                      >
                        {row.member.lastName}, {row.member.firstName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {row.type.name}
                      {row.identifier ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          #{row.identifier}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.expiresAt ? formatDateOnly(row.expiresAt) : '—'}
                      {remaining === null ? null : remaining < 0 ? (
                        <Badge variant="destructive" className="ml-2">
                          lapsed
                        </Badge>
                      ) : (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {remaining} day{remaining === 1 ? '' : 's'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <a
                        href={`mailto:${row.member.email}`}
                        className="underline underline-offset-2"
                      >
                        {row.member.email}
                      </a>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
