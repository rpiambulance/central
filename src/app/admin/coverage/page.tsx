import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
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
  status: string;
  _count: { messages: number };
  event: {
    id: number;
    title: string;
    workflowStatus: string;
  } | null;
};

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

export default async function AdminCoveragePage() {
  const hour12 = await prefers12Hour();
  let requests: CoverageRequestRow[];
  try {
    requests = await api<CoverageRequestRow[]>('/v1/coverage-requests');
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coverage requests"
        description="External requests for EMS event coverage."
      />
      {requests.length ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requester</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Event</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
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
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No coverage requests yet.
        </p>
      )}
    </div>
  );
}
