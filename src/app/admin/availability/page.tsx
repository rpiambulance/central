import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
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
import {
  InvitePicker,
  type CredentialType,
  type InviteMember,
} from './invite-picker';
import { createPoll } from './actions';

type Poll = {
  id: number;
  name: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  createdBy: { id: number; firstName: string; lastName: string };
  _count: { invites: number };
};

type Member = InviteMember;

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

export default async function AdminAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  let polls: Poll[];
  let members: Member[];
  let credentialTypes: CredentialType[];
  try {
    [polls, members, credentialTypes] = await Promise.all([
      api<Poll[]>('/v1/availability/polls'),
      api<Member[]>('/v1/members'),
      api<CredentialType[]>('/v1/credentials/types'),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Availability Polls"
        description="Ask members which weeknights they can ride, then overlay the results while building the default schedule."
      />
      <ErrorBanner message={error} />

      <section className="space-y-2">
        <h2 className="text-lg font-medium tracking-tight">Polls</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invited</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {polls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No polls yet.
                  </TableCell>
                </TableRow>
              ) : (
                polls.map((poll) => (
                  <TableRow key={poll.id}>
                    <TableCell>
                      <Link
                        href={`/admin/availability/${poll.id}`}
                        className="font-medium underline underline-offset-2 hover:text-foreground"
                      >
                        {poll.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={poll.status === 'OPEN' ? 'default' : 'secondary'}
                      >
                        {poll.status === 'OPEN' ? 'Open' : 'Closed'}
                      </Badge>
                    </TableCell>
                    <TableCell>{poll._count.invites}</TableCell>
                    <TableCell>
                      {poll.createdBy.firstName} {poll.createdBy.lastName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(poll.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium tracking-tight">New poll</h2>
        <Card>
          <CardContent className="pt-6">
            <form action={createPoll} className="space-y-4">
              <div className="grid gap-1">
                <label htmlFor="poll-name" className="text-sm font-medium">
                  Name
                </label>
                <input
                  id="poll-name"
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Fall 2026 weekly availability"
                  className="h-8 max-w-md rounded-md border border-input bg-background px-2 text-sm"
                />
              </div>
              <InvitePicker
                members={members}
                credentialTypes={credentialTypes}
              />
              <Button type="submit" variant="outline" size="sm">
                Create poll
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
