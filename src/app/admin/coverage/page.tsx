import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { prefers12Hour } from '@/lib/me';
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
import { WorkflowBadge } from '@/components/workflow-badge';

type CoverageRequestRow = {
  id: number;
  requesterName: string;
  requesterOrg: string | null;
  createdAt: string;
  requestedDate: string | null;
  status: string;
  _count: { messages: number };
  event: {
    id: number;
    title: string;
    workflowStatus: string;
    startsAt: string | null;
  } | null;
};

/** Approved, declined or cancelled — nothing further to do. */
const SETTLED = ['APPROVED', 'DENIED', 'CANCELLED'];

const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

/**
 * When the request is for. The event's own start once one exists, otherwise
 * the date the requester asked for.
 */
function eventDate(request: CoverageRequestRow): string | null {
  return request.event?.startsAt ?? request.requestedDate;
}

function byEventDate(direction: 1 | -1) {
  return (a: CoverageRequestRow, b: CoverageRequestRow) => {
    const left = eventDate(a);
    const right = eventDate(b);
    // Undated requests sit at the end either way — they need a date before
    // they need ordering.
    if (!left && !right) return 0;
    if (!left) return 1;
    if (!right) return -1;
    return left < right ? -direction : left > right ? direction : 0;
  };
}

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Coverage requests require additional permissions. If you think you
          should have access, contact an officer.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function Dash() {
  return <span className="text-muted-foreground">&mdash;</span>;
}

function RequestTable({
  title,
  description,
  rows,
  total,
  page,
  pageCount,
  pageParam,
  otherPage,
  otherParam,
  pageSize,
  hour12,
}: {
  title: string;
  description: string;
  rows: CoverageRequestRow[];
  total: number;
  page: number;
  pageCount: number;
  pageParam: string;
  otherPage: number;
  otherParam: string;
  pageSize: number;
  hour12: boolean;
}) {
  // Paging one table must not reset the other, so both pages travel together.
  const linkTo = (target: number) => {
    const search = new URLSearchParams({
      [pageParam]: String(target),
      [otherParam]: String(otherPage),
      pageSize: String(pageSize),
    });
    return `/admin/coverage?${search}`;
  };

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-lg font-medium tracking-tight">{title}</h2>
        <span className="text-sm text-muted-foreground">{description}</span>
        <span className="ml-auto text-sm text-muted-foreground">
          {total} request{total === 1 ? '' : 's'}
          {pageCount > 1 ? ` · page ${page} of ${pageCount}` : ''}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md border px-3 py-6 text-center text-sm text-muted-foreground">
          Nothing here.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requester</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Event date</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Event</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((request) => {
                const when = eventDate(request);
                return (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      <Link
                        href={`/admin/coverage/${request.id}`}
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        {request.requesterName}
                      </Link>
                    </TableCell>
                    <TableCell>{request.requesterOrg ?? <Dash />}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {when ? formatDate(when) : <Dash />}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(request.createdAt, hour12)}
                    </TableCell>
                    <TableCell>
                      <WorkflowBadge status={request.status} />
                    </TableCell>
                    <TableCell>{request._count.messages}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {request.event ? (
                        <Link
                          href={`/events/${request.event.id}`}
                          className="underline underline-offset-2 hover:text-foreground"
                        >
                          {request.event.title}
                        </Link>
                      ) : (
                        <Dash />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {pageCount > 1 ? (
        <div className="flex items-center gap-3 text-sm">
          {page > 1 ? (
            <Link href={linkTo(page - 1)} className="underline underline-offset-2">
              &larr; Previous
            </Link>
          ) : null}
          {page < pageCount ? (
            <Link href={linkTo(page + 1)} className="underline underline-offset-2">
              Next &rarr;
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default async function AdminCoveragePage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string; done?: string; pageSize?: string }>;
}) {
  const params = await searchParams;
  const pageSize = PAGE_SIZES.includes(Number(params.pageSize))
    ? Number(params.pageSize)
    : DEFAULT_PAGE_SIZE;
  const hour12 = await prefers12Hour();
  // The address to hand people asking for coverage. Set COVERAGE_REQUEST_URL
  // when a friendlier link redirects here from elsewhere — that is what should
  // be shared, not this app's own path. Otherwise fall back to this app's
  // public origin, which is right in every environment without a second
  // variable to keep in step.
  const publicRequestUrl =
    process.env.COVERAGE_REQUEST_URL?.trim() ||
    `${(process.env.AUTH_URL ?? '').replace(/\/$/, '')}/request-coverage`;
  let requests: CoverageRequestRow[];
  try {
    requests = await api<CoverageRequestRow[]>('/v1/coverage-requests');
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  const paginate = (rows: CoverageRequestRow[], raw?: string) => {
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
    const page = Math.min(Math.max(1, Number(raw) || 1), pageCount);
    return {
      rows: rows.slice((page - 1) * pageSize, page * pageSize),
      total: rows.length,
      page,
      pageCount,
    };
  };
  const inProgress = paginate(
    requests.filter((r) => !SETTLED.includes(r.status)).sort(byEventDate(1)),
    params.open,
  );
  const settled = paginate(
    requests.filter((r) => SETTLED.includes(r.status)).sort(byEventDate(-1)),
    params.done,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coverage requests"
        description="External requests for EMS event coverage."
      />

      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
        <span className="text-muted-foreground">
          Requesters submit these themselves at
        </span>{' '}
        <a
          href={publicRequestUrl}
          className="font-mono underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          {publicRequestUrl}
        </a>
        <span className="text-muted-foreground">
          {' '}
          — no account needed. Share that link with anyone asking for coverage.
        </span>
      </div>
      {inProgress.total === 0 && settled.total === 0 ? (
        <p className="text-sm text-muted-foreground">No coverage requests.</p>
      ) : null}

      <RequestTable
        title="In progress"
        description="Sorted by when the event is, soonest first."
        rows={inProgress.rows}
        total={inProgress.total}
        page={inProgress.page}
        pageCount={inProgress.pageCount}
        pageParam="open"
        otherPage={settled.page}
        otherParam="done"
        pageSize={pageSize}
        hour12={hour12}
      />

      <RequestTable
        title="Completed"
        description="Approved, declined or cancelled. Most recent first."
        rows={settled.rows}
        total={settled.total}
        page={settled.page}
        pageCount={settled.pageCount}
        pageParam="done"
        otherPage={inProgress.page}
        otherParam="open"
        pageSize={pageSize}
        hour12={hour12}
      />
    </div>
  );
}
