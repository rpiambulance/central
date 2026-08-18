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

type ScoreType =
  | 'SCALE_1_5'
  | 'PASS_FAIL'
  | 'TEXT'
  | 'SHORT_TEXT'
  | 'NUMBER'
  | 'OPTIONS'
  | 'MULTI_SELECT'
  | 'HEADING'
  | 'SIGNOFF';

type Item = {
  id: number;
  order: number;
  prompt: string;
  scoreType: ScoreType;
  options?: Array<{ value: string; label: string }> | null;
  minValue?: number | null;
  maxValue?: number | null;
  unit?: string | null;
};

type Group = {
  id: number;
  order: number;
  heading: string;
  description: string | null;
  items: Item[];
};

type Score = {
  itemId: number;
  scaleValue: number | null;
  passed: boolean | null;
  textValue: string | null;
  optionValue: string | null;
  optionValues: string[] | null;
  numberValue: number | null;
};

type Evaluation = {
  id: number;
  status: 'DRAFT' | 'SUBMITTED' | 'SIGNED';
  shiftDate: string | null;
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

function ReadOnlyScore({ item, score }: { item: Item; score?: Score }) {
  // A heading asks nothing, so there is nothing to show against it.
  if (item.scoreType === 'HEADING') return null;
  if (!score) return <span className="text-muted-foreground">&mdash;</span>;
  if (item.scoreType === 'OPTIONS') {
    const chosen = (item.options ?? []).find(
      (option) => option.value === score.optionValue,
    );
    return chosen ? (
      <span className="font-medium">{chosen.label}</span>
    ) : (
      <span className="text-muted-foreground">&mdash;</span>
    );
  }
  if (item.scoreType === 'MULTI_SELECT') {
    const chosen = (item.options ?? []).filter((option) =>
      (score.optionValues ?? []).includes(option.value),
    );
    return chosen.length ? (
      <span className="flex flex-wrap gap-1">
        {chosen.map((option) => (
          <Badge key={option.value} variant="secondary">
            {option.label}
          </Badge>
        ))}
      </span>
    ) : (
      <span className="text-muted-foreground">&mdash;</span>
    );
  }
  if (item.scoreType === 'NUMBER') {
    return score.numberValue !== null ? (
      <span className="font-medium">
        {score.numberValue}
        {item.unit ? ` ${item.unit}` : ''}
      </span>
    ) : (
      <span className="text-muted-foreground">&mdash;</span>
    );
  }
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

/**
 * One choice in a {@link ChoiceGroup}: a radio wearing a button.
 *
 * The input stays in the markup (visually hidden, not `hidden`) so the group
 * is still a real radio group — keyboard arrows, labels, and the form value
 * all behave as they would with a plain set of radios.
 */
function Choice({
  name,
  value,
  label,
  checked,
  tone = 'primary',
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  tone?: 'primary' | 'destructive' | 'muted';
}) {
  const selected =
    tone === 'destructive'
      ? 'peer-checked:border-destructive peer-checked:bg-destructive peer-checked:text-white'
      : tone === 'muted'
        ? 'peer-checked:border-foreground/40 peer-checked:bg-muted peer-checked:text-foreground'
        : 'peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground';
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={checked}
        className="peer sr-only"
      />
      <span
        className={`block rounded-md border border-input px-3 py-1.5 text-sm transition-colors hover:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 ${selected}`}
      >
        {label}
      </span>
    </label>
  );
}

/** A row of choices, with a way back to no answer at all. */
function ChoiceGroup({
  children,
  clear,
}: {
  children: React.ReactNode;
  clear: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      <span className="ml-1 border-l pl-3">{clear}</span>
    </div>
  );
}

function ScoreInput({ item, score }: { item: Item; score?: Score }) {
  const name = `item-${item.id}`;
  if (item.scoreType === 'HEADING') return null;
  if (item.scoreType === 'OPTIONS') {
    const chosen = score?.optionValue ?? '';
    return (
      <ChoiceGroup
        clear={
          <Choice
            name={name}
            value=""
            label="No answer"
            checked={chosen === ''}
            tone="muted"
          />
        }
      >
        {(item.options ?? []).map((option) => (
          <Choice
            key={option.value}
            name={name}
            value={option.value}
            label={option.label}
            checked={chosen === option.value}
          />
        ))}
      </ChoiceGroup>
    );
  }
  if (item.scoreType === 'MULTI_SELECT') {
    // Checkboxes rather than a multi-select list: a list box hides how many
    // are picked and needs a modifier key to pick a second one.
    const chosen = score?.optionValues ?? [];
    return (
      <div className="flex flex-wrap items-center gap-2">
        {(item.options ?? []).map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={chosen.includes(option.value)}
              className="peer sr-only"
            />
            <span className="block rounded-md border border-input px-3 py-1.5 text-sm transition-colors hover:bg-muted peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    );
  }
  if (item.scoreType === 'NUMBER') {
    return (
      <span className="flex items-center gap-2">
        <input
          type="number"
          name={name}
          step="any"
          {...(item.minValue !== null && item.minValue !== undefined
            ? { min: item.minValue }
            : {})}
          {...(item.maxValue !== null && item.maxValue !== undefined
            ? { max: item.maxValue }
            : {})}
          defaultValue={score?.numberValue ?? ''}
          className="h-9 w-32 rounded-md border border-input bg-background px-2 text-sm"
        />
        {item.unit ? (
          <span className="text-sm text-muted-foreground">{item.unit}</span>
        ) : null}
      </span>
    );
  }
  if (item.scoreType === 'SHORT_TEXT') {
    return (
      <input
        type="text"
        name={name}
        defaultValue={score?.textValue ?? ''}
        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
      />
    );
  }
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
      <ChoiceGroup
        clear={
          <Choice
            name={name}
            value=""
            label="No answer"
            checked={score?.passed === null || score?.passed === undefined}
            tone="muted"
          />
        }
      >
        <Choice
          name={name}
          value="pass"
          label="Pass"
          checked={score?.passed === true}
        />
        <Choice
          name={name}
          value="fail"
          label="Fail"
          checked={score?.passed === false}
          tone="destructive"
        />
      </ChoiceGroup>
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

/** One question on the form, ready to answer. A heading only labels. */
function EditableItem({ item, score }: { item: Item; score?: Score }) {
  if (item.scoreType === 'HEADING') {
    return (
      <h3 className="pt-2 text-sm font-semibold tracking-tight">
        {item.prompt}
      </h3>
    );
  }
  return (
    <div className="space-y-1.5 rounded-md border p-4">
      <p className="text-sm font-medium">{item.prompt}</p>
      <ScoreInput item={item} score={score} />
    </div>
  );
}

function ReadOnlyItem({ item, score }: { item: Item; score?: Score }) {
  if (item.scoreType === 'HEADING') {
    return (
      <h3 className="pt-2 text-sm font-semibold tracking-tight">
        {item.prompt}
      </h3>
    );
  }
  return (
    <div className="space-y-1.5 rounded-md border p-4">
      <p className="text-sm font-medium">{item.prompt}</p>
      <div className="text-sm">
        <ReadOnlyScore item={item} score={score} />
      </div>
    </div>
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
        description={`${evaluation.evaluator.firstName} ${evaluation.evaluator.lastName} evaluating ${evaluation.subject.firstName} ${evaluation.subject.lastName} — ${evaluation.shiftDate ? formatDateOnly(evaluation.shiftDate) : formatDate(evaluation.createdAt)}`}
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
