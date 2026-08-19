import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { formatDate, formatDateOnly } from '@/lib/format';
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
import { createEval, requestEval } from './actions';
import {
  RequestForm,
  type EvaluatorSet,
  type RequestTemplate,
} from './request-form';

type Evaluation = {
  id: number;
  status: 'DRAFT' | 'SUBMITTED' | 'SIGNED';
  evalDate: string | null;
  createdAt: string;
  template: { id: number; name: string };
  evaluator: { id: number; firstName: string; lastName: string };
  subject: { id: number; firstName: string; lastName: string };
};

type Template = RequestTemplate;

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
  searchParams: Promise<{
    error?: string;
    deleted?: string;
    requested?: string;
  }>;
}) {
  const { error, deleted, requested } = await searchParams;

  let evals: Evaluation[];
  let templates: Template[];
  let evaluators: EvaluatorSet[];
  try {
    [evals, templates, evaluators] = await Promise.all([
      api<Evaluation[]>('/v1/evals/mine'),
      api<Template[]>('/v1/evals/templates?kind=EVALUATION'),
      api<EvaluatorSet[]>('/v1/evals/evaluators'),
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
      {deleted ? (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          Evaluation deleted.
        </p>
      ) : null}
      {requested ? (
        <p className="rounded-md border border-emerald-600/40 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
          Asked. It is on the trainer&apos;s to-do list, with whatever you
          filled in.
        </p>
      ) : null}

      {/* Anyone may ask to be evaluated; writing one is the privilege. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ask for an evaluation</CardTitle>
          <CardDescription>
            Pick the form and the trainer, and fill in your part. It lands on
            their to-do list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RequestForm
            templates={templates}
            evaluators={evaluators}
            action={requestEval}
          />
        </CardContent>
      </Card>

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
                <span className="text-muted-foreground">Eval date</span>
                <input
                  type="date"
                  name="evalDate"
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
                        {ev.evalDate ? formatDateOnly(ev.evalDate) : formatDate(ev.createdAt)}
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
