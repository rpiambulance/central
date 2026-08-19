import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { prefers12Hour } from '@/lib/me';
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
import { Button } from '@/components/ui/button';
import { ProgressBar } from '../progress-bar';
import { startChecklist } from '../actions';
import { signersLabel, type ChecklistSummary } from '../types';

type Row = {
  member: { id: number; firstName: string; lastName: string };
  signed: number;
  total: number;
  complete: boolean;
  lastSignedAt: string | null;
  startedAt: string | null;
  startedBy: string | null;
};

type Member = { id: number; firstName: string; lastName: string };

export const dynamic = 'force-dynamic';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Seeing who is working through a checklist needs the member directory.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function ChecklistSubjectsPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const id = Number(templateId);
  const hour12 = await prefers12Hour();

  let rows: Row[];
  let checklists: ChecklistSummary[];
  let notStarted: Member[] = [];
  try {
    [rows, checklists, notStarted] = await Promise.all([
      api<Row[]>(`/v1/checklists/${id}/members`),
      api<ChecklistSummary[]>('/v1/checklists'),
      api<Member[]>(`/v1/checklists/${id}/not-started`).catch(() => []),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return <NoAccess />;
    throw error;
  }
  const checklist = checklists.find((c) => c.id === id);

  // Whoever has been started but is not finished is the useful default view;
  // people with nothing signed sit below them rather than at the top.
  const started = rows.filter((row) => row.signed > 0 && !row.complete);
  const complete = rows.filter((row) => row.complete);
  const untouched = rows.filter((row) => row.signed === 0);

  const section = (label: string, list: Row[]) =>
    list.length ? (
      <section className="space-y-2" key={label}>
        <h2 className="text-lg font-medium tracking-tight">
          {label}{' '}
          <span className="text-sm font-normal text-muted-foreground">
            ({list.length})
          </span>
        </h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Last signed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((row) => (
                <TableRow key={row.member.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    <Link
                      href={`/checklists/${id}/${row.member.id}`}
                      className="underline underline-offset-2"
                    >
                      {row.member.lastName}, {row.member.firstName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <ProgressBar signed={row.signed} total={row.total} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {row.lastSignedAt
                      ? formatDateTime(row.lastSignedAt, hour12)
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    ) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title={checklist?.name ?? 'Checklist'}
        description={
          checklist?.signoffCredentialTypes.length
            ? `Signed by ${signersLabel(checklist.signoffCredentialTypes)}, except where a line names its own.`
            : 'Everyone this checklist currently applies to.'
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/checklists"
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          &larr; All checklists
        </Link>
        {checklist?.leadsTo.map((credential) => (
          <Badge key={credential.id} variant="secondary">
            Required for {credential.name}
          </Badge>
        ))}
      </div>

      {rows.length ? (
        <>
          {section('In progress', started)}
          {section('Started, nothing signed yet', untouched)}
          {section('Complete', complete)}
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nobody has been started on this checklist yet.
          </CardContent>
        </Card>
      )}

      {/* A checklist reaches somebody by being started, so this is where a
          trainer puts them on it. */}
      {notStarted.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Start somebody on this</CardTitle>
            <CardDescription>
              They are told, and it appears in their checklists.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={startChecklist.bind(null, id, null)}
              className="flex flex-wrap items-end gap-2"
            >
              <label className="grid gap-1 text-xs text-muted-foreground">
                Member
                <select
                  name="memberId"
                  required
                  className="h-9 w-64 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {notStarted.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.lastName}, {member.firstName}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" size="sm">
                Start
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
