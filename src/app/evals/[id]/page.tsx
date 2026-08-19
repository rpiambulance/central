import { api, ApiError } from '@/lib/api';
import { myPermissions, prefers12Hour } from '@/lib/me';
import { formatDate, formatDateOnly, formatDateTime } from '@/lib/format';
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
import { FormGroup } from '@/components/form-group';
import { formNodes } from '@/lib/form-nodes';
import { PageHeader } from '@/components/page-header';
import { deleteEval, saveScores, signEval } from './actions';
import {
  EditableItem,
  ReadOnlyItem,
  type Item,
  type Score,
} from '../score-input';

type Group = {
  id: number;
  order: number;
  heading: string;
  description: string | null;
  items: Item[];
};

type Evaluation = {
  id: number;
  status: 'DRAFT' | 'SUBMITTED' | 'SIGNED';
  evalDate: string | null;
  createdAt: string;
  notes: string | null;
  outcome: 'NEEDS_IMPROVEMENT' | 'PASSED' | null;
  readyForPromotion: boolean | null;
  signedByEvaluator: string | null;
  signedBySubject: string | null;
  template: {
    id: number;
    name: string;
    version: number;
    items: Item[];
    groups?: Group[];
  };
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
  const permissions = await myPermissions();
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
  const groups = evaluation.template.groups ?? [];
  // Groups sit wherever they were placed, so the two lists interleave.
  const nodes = formNodes(evaluation.template.items, groups);
  // The save action needs every item on the form, wherever it sits.
  const items = [
    ...evaluation.template.items,
    ...groups.flatMap((group) => group.items),
  ];
  const editable =
    evaluation.status !== 'SIGNED' && me.id === evaluation.evaluator.id;
  // Discarding an unfinished evaluation and erasing a finished one are held
  // separately, so which permission counts depends on where this one stands.
  const canDelete = permissions.has(
    evaluation.status === 'DRAFT'
      ? 'evals:delete-draft'
      : 'evals:delete-completed',
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={evaluation.template.name}
        description={`${evaluation.evaluator.firstName} ${evaluation.evaluator.lastName} evaluating ${evaluation.subject.firstName} ${evaluation.subject.lastName} — ${evaluation.evalDate ? formatDateOnly(evaluation.evalDate) : formatDate(evaluation.createdAt)}`}
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
            {nodes.map((node) =>
              node.kind === 'GROUP' ? (
                <FormGroup
                  key={`g${node.group.id}`}
                  as="fieldset"
                  heading={node.group.heading}
                  description={node.group.description}
                >
                  {node.group.items.map((item) => (
                    <EditableItem
                      key={item.id}
                      item={item}
                      score={scoreByItem.get(item.id)}
                    />
                  ))}
                </FormGroup>
              ) : (
                <EditableItem
                  key={`i${node.item.id}`}
                  item={node.item}
                  score={scoreByItem.get(node.item.id)}
                />
              ),
            )}
          </div>
          <div className="grid gap-4 rounded-md border p-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Overall result</span>
              <select
                name="outcome"
                defaultValue={evaluation.outcome ?? ''}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">&mdash;</option>
                <option value="NEEDS_IMPROVEMENT">Needs improvement</option>
                <option value="PASSED">Passed</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Ready for promotion?</span>
              <select
                name="readyForPromotion"
                defaultValue={
                  evaluation.readyForPromotion === null ||
                  evaluation.readyForPromotion === undefined
                    ? ''
                    : evaluation.readyForPromotion
                      ? 'yes'
                      : 'no'
                }
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">&mdash;</option>
                <option value="yes">Yes</option>
                <option value="no">Not yet</option>
              </select>
            </label>
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
          {nodes.map((node) =>
            node.kind === 'GROUP' ? (
              <FormGroup
                key={`g${node.group.id}`}
                heading={node.group.heading}
                description={node.group.description}
              >
                {node.group.items.map((item) => (
                  <ReadOnlyItem
                    key={item.id}
                    item={item}
                    score={scoreByItem.get(item.id)}
                  />
                ))}
              </FormGroup>
            ) : (
              <ReadOnlyItem
                key={`i${node.item.id}`}
                item={node.item}
                score={scoreByItem.get(node.item.id)}
              />
            ),
          )}
          <div className="space-y-1.5 rounded-md border p-4">
            <p className="text-sm font-medium">Overall notes</p>
            <p className="text-sm whitespace-pre-wrap">
              {evaluation.notes ?? (
                <span className="text-muted-foreground">&mdash;</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 rounded-md border p-4 text-sm">
            <span>
              <span className="font-medium">Overall result:</span>{' '}
              {evaluation.outcome === 'PASSED' ? (
                <Badge>Passed</Badge>
              ) : evaluation.outcome === 'NEEDS_IMPROVEMENT' ? (
                <Badge variant="destructive">Needs improvement</Badge>
              ) : (
                <span className="text-muted-foreground">&mdash;</span>
              )}
            </span>
            <span>
              <span className="font-medium">Ready for promotion:</span>{' '}
              {evaluation.readyForPromotion === null ? (
                <span className="text-muted-foreground">&mdash;</span>
              ) : evaluation.readyForPromotion ? (
                'Yes'
              ) : (
                'Not yet'
              )}
            </span>
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

      {canDelete ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Delete this evaluation</CardTitle>
            <CardDescription>
              {evaluation.status === 'DRAFT'
                ? 'This one was never submitted, so nobody has seen it. Deleting it removes the draft and everything written so far.'
                : `This evaluation is part of ${evaluation.subject.firstName} ${evaluation.subject.lastName}'s record and may already count toward a promotion. Deleting it also withdraws any request to sign it.`}{' '}
              This cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Two steps on purpose: not reachable by one stray click. */}
            <details>
              <summary className="cursor-pointer text-sm text-muted-foreground">
                I want to delete this evaluation
              </summary>
              <form
                action={deleteEval.bind(null, evaluation.id)}
                className="mt-3"
              >
                <Button type="submit" size="sm" variant="destructive">
                  Delete this {evaluation.template.name}
                </Button>
              </form>
            </details>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
