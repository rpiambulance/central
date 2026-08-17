import { api, ApiError } from '@/lib/api';
import { prefers12Hour } from '@/lib/me';
import { formatDate, formatDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ErrorBanner } from '@/components/error-banner';
import { PageHeader } from '@/components/page-header';
import { saveScores, signEval } from './actions';

type ScoreType = 'SCALE_1_5' | 'PASS_FAIL' | 'TEXT';

type Item = {
  id: number;
  order: number;
  prompt: string;
  scoreType: ScoreType;
};

type Score = {
  itemId: number;
  scaleValue: number | null;
  passed: boolean | null;
  textValue: string | null;
};

type Evaluation = {
  id: number;
  status: 'DRAFT' | 'SUBMITTED' | 'SIGNED';
  shiftDate: string | null;
  createdAt: string;
  notes: string | null;
  signedByEvaluator: string | null;
  signedBySubject: string | null;
  template: { id: number; name: string; version: number; items: Item[] };
  scores: Score[];
  evaluator: { id: number; firstName: string; lastName: string };
  subject: { id: number; firstName: string; lastName: string };
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
          Only the evaluator, the subject, and training staff can view this
          evaluation.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function ReadOnlyScore({ item, score }: { item: Item; score?: Score }) {
  if (!score) return <span className="text-muted-foreground">&mdash;</span>;
  if (item.scoreType === 'SCALE_1_5') {
    return score.scaleValue !== null ? (
      <span className="font-medium">{score.scaleValue} / 5</span>
    ) : (
      <span className="text-muted-foreground">&mdash;</span>
    );
  }
  if (item.scoreType === 'PASS_FAIL') {
    if (score.passed === null) {
      return <span className="text-muted-foreground">&mdash;</span>;
    }
    return (
      <Badge variant={score.passed ? 'default' : 'destructive'}>
        {score.passed ? 'Pass' : 'Fail'}
      </Badge>
    );
  }
  return score.textValue ? (
    <span className="whitespace-pre-wrap">{score.textValue}</span>
  ) : (
    <span className="text-muted-foreground">&mdash;</span>
  );
}

function ScoreInput({ item, score }: { item: Item; score?: Score }) {
  const name = `item-${item.id}`;
  if (item.scoreType === 'SCALE_1_5') {
    return (
      <select
        name={name}
        defaultValue={score?.scaleValue ?? ''}
        className="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm"
      >
        <option value="">&mdash;</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    );
  }
  if (item.scoreType === 'PASS_FAIL') {
    return (
      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name={name}
            value="pass"
            defaultChecked={score?.passed === true}
          />
          Pass
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name={name}
            value="fail"
            defaultChecked={score?.passed === false}
          />
          Fail
        </label>
      </div>
    );
  }
  return (
    <textarea
      name={name}
      rows={3}
      defaultValue={score?.textValue ?? ''}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
    />
  );
}

function SignatureLine({
  label,
  name,
  signedAt,
  hour12,
}: {
  label: string;
  name: string;
  signedAt: string | null;
  hour12: boolean;
}) {
  return (
    <p className="text-sm">
      <span className="font-medium">{label}</span> ({name}):{' '}
      {signedAt ? (
        <span className="text-green-600 dark:text-green-500">
          signed {formatDateTime(signedAt, hour12)}
        </span>
      ) : (
        <span className="text-muted-foreground">not signed</span>
      )}
    </p>
  );
}

export default async function EvalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const hour12 = await prefers12Hour();
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const evalId = Number(id);

  let evaluation: Evaluation;
  let me: { id: number };
  try {
    [evaluation, me] = await Promise.all([
      api<Evaluation>(`/v1/evals/${evalId}`),
      api<{ id: number }>('/v1/members/me'),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  const badge = STATUS_BADGE[evaluation.status];
  const scoreByItem = new Map(evaluation.scores.map((s) => [s.itemId, s]));
  const items = evaluation.template.items;
  const editable =
    evaluation.status !== 'SIGNED' && me.id === evaluation.evaluator.id;

  return (
    <div className="space-y-6">
      <PageHeader
        title={evaluation.template.name}
        description={`${evaluation.evaluator.firstName} ${evaluation.evaluator.lastName} evaluating ${evaluation.subject.firstName} ${evaluation.subject.lastName} — ${formatDate(evaluation.shiftDate ?? evaluation.createdAt)}`}
      />
      <ErrorBanner message={error} />

      <div className="flex items-center gap-2">
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      {editable ? (
        <form
          key={JSON.stringify([evaluation.scores, evaluation.notes])}
          action={saveScores.bind(null, evaluation.id, items.map((i) => ({ id: i.id, scoreType: i.scoreType })))}
          className="space-y-6"
        >
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="space-y-1.5 rounded-md border p-4">
                <p className="text-sm font-medium">{item.prompt}</p>
                <ScoreInput item={item} score={scoreByItem.get(item.id)} />
              </div>
            ))}
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Overall notes</span>
            <textarea
              name="notes"
              rows={4}
              defaultValue={evaluation.notes ?? ''}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <Button
              type="submit"
              name="intent"
              value="save"
              variant="outline"
            >
              Save draft
            </Button>
            <Button type="submit" name="intent" value="submit">
              Submit
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="space-y-1.5 rounded-md border p-4">
              <p className="text-sm font-medium">{item.prompt}</p>
              <div className="text-sm">
                <ReadOnlyScore item={item} score={scoreByItem.get(item.id)} />
              </div>
            </div>
          ))}
          <div className="space-y-1.5 rounded-md border p-4">
            <p className="text-sm font-medium">Overall notes</p>
            <p className="text-sm whitespace-pre-wrap">
              {evaluation.notes ?? (
                <span className="text-muted-foreground">&mdash;</span>
              )}
            </p>
          </div>
        </div>
      )}

      {evaluation.status !== 'DRAFT' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signatures</CardTitle>
            <CardDescription>
              Both the evaluator and the subject must sign before this
              evaluation counts toward promotion requirements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SignatureLine
              hour12={hour12}
              label="Evaluator"
              name={`${evaluation.evaluator.firstName} ${evaluation.evaluator.lastName}`}
              signedAt={evaluation.signedByEvaluator}
            />
            <SignatureLine
              hour12={hour12}
              label="Subject"
              name={`${evaluation.subject.firstName} ${evaluation.subject.lastName}`}
              signedAt={evaluation.signedBySubject}
            />
            {evaluation.status !== 'SIGNED' ? (
              <form action={signEval.bind(null, evaluation.id)}>
                <Button type="submit" size="sm">
                  Sign
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
