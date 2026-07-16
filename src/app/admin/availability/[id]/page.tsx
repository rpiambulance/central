import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { ErrorBanner } from '@/components/error-banner';
import { PageHeader } from '@/components/page-header';
import { setPollStatus } from '../actions';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Status = 'AVAILABLE' | 'UNAVAILABLE' | 'IF_NEEDED';

type PollGrid = {
  id: number;
  name: string;
  status: 'OPEN' | 'CLOSED';
  members: {
    member: { id: number; firstName: string; lastName: string };
    responded: boolean;
    days: Record<string, Status>;
  }[];
};

const CELL_STYLES: Record<Status, string> = {
  AVAILABLE:
    'bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200',
  IF_NEEDED:
    'bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200',
  UNAVAILABLE: 'bg-red-100/60 text-red-900/70 dark:bg-red-950/60 dark:text-red-200/70',
};

const CELL_LABELS: Record<Status, string> = {
  AVAILABLE: 'Available',
  IF_NEEDED: 'If needed',
  UNAVAILABLE: 'Not available',
};

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Availability poll administration requires additional permissions. If
          you think you should have access, contact an officer.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function AdminAvailabilityPollPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const pollId = Number(id);
  if (!Number.isInteger(pollId)) notFound();

  let poll: PollGrid;
  try {
    poll = await api<PollGrid>(`/v1/availability/polls/${pollId}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const respondedCount = poll.members.filter((m) => m.responded).length;
  const nextStatus = poll.status === 'OPEN' ? 'CLOSED' : 'OPEN';

  return (
    <div className="space-y-6">
      <PageHeader
        title={poll.name}
        description="Member responses by weekday."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/availability"
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          &larr; All polls
        </Link>
        <Badge variant={poll.status === 'OPEN' ? 'default' : 'secondary'}>
          {poll.status === 'OPEN' ? 'Open' : 'Closed'}
        </Badge>
        <span className="text-sm text-muted-foreground">
          responded {respondedCount}/{poll.members.length}
        </span>
        <form action={setPollStatus.bind(null, poll.id, nextStatus)}>
          <Button type="submit" variant="outline" size="sm" className="h-7">
            {poll.status === 'OPEN' ? 'Close poll' : 'Reopen poll'}
          </Button>
        </form>
      </div>
      <ErrorBanner message={error} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">Member</TableHead>
              {WEEKDAYS.map((day) => (
                <TableHead key={day}>{day}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {poll.members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  No members invited.
                </TableCell>
              </TableRow>
            ) : (
              poll.members.map(({ member, responded, days }) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {member.lastName}, {member.firstName}
                    {!responded ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        no response
                      </span>
                    ) : null}
                  </TableCell>
                  {WEEKDAYS.map((_, weekday) => {
                    const status = days[String(weekday)];
                    if (!status) {
                      return (
                        <TableCell
                          key={weekday}
                          className="text-muted-foreground"
                        >
                          &mdash;
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell
                        key={weekday}
                        className={`text-xs ${CELL_STYLES[status]}`}
                      >
                        {CELL_LABELS[status]}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
