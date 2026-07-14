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
import { createEval } from './actions';

type Evaluation = {
  id: number;
  status: 'DRAFT' | 'SUBMITTED' | 'SIGNED';
  shiftDate: string | null;
  createdAt: string;
  template: { id: number; name: string };
  evaluator: { id: number; firstName: string; lastName: string };
  subject: { id: number; firstName: string; lastName: string };
};

type Template = {
  id: number;
  name: string;
  version: number;
};

type Member = {
  id: number;
  firstName: string;
  lastName: string;
};

const STATUS_BADGE: Record<
  Evaluation['status'],
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  DRAFT: { label: 'Draft', variant: 'outline' },
  SUBMITTED: { label: 'Submitted', variant: 'secondary' },
  SIGNED: { label: 'Signed', variant: 'default' },
};

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Evaluations require a member session. If you think you should have
          access, contact an officer.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function EvalsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  let evals: Evaluation[];
  let templates: Template[];
  try {
    [evals, templates] = await Promise.all([
      api<Evaluation[]>('/v1/evals/mine'),
      api<Template[]>('/v1/evals/templates'),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  // Regular members may not be able to list the roster; hide the form then.
  let members: Member[] | null = null;
  try {
    members = await api<Member[]>('/v1/members');
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      members = null;
    } else {
      throw err;
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Evaluations"
        description="Evaluations you wrote or are the subject of."
      />
      <ErrorBanner message={error} />

      {members ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New evaluation</CardTitle>
            <CardDescription>
              Start an evaluation of another member.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={createEval}
              className="flex flex-wrap items-end gap-3"
            >
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Form</span>
                <select
                  name="templateId"
                  required
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} (v{template.version})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Subject</span>
                <select
                  name="subjectId"
                  required
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.lastName}, {member.firstName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Shift date</span>
                <input
                  type="date"
                  name="shiftDate"
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                />
              </label>
              <Button type="submit" size="sm">
                Create
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-lg font-medium tracking-tight">My evaluations</h2>
        {evals.length ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form</TableHead>
                  <TableHead>Evaluator</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evals.map((ev) => {
                  const badge = STATUS_BADGE[ev.status];
                  return (
                    <TableRow key={ev.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/evals/${ev.id}`}
                          className="underline underline-offset-2 hover:text-foreground"
                        >
                          {ev.template.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {ev.evaluator.firstName} {ev.evaluator.lastName}
                      </TableCell>
                      <TableCell>
                        {ev.subject.firstName} {ev.subject.lastName}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(ev.shiftDate ?? ev.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No evaluations yet.</p>
        )}
      </section>
    </div>
  );
}
