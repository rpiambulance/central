import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { myMemberId, prefers12Hour } from '@/lib/me';
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
import { ProgressBar } from '../../progress-bar';
import { revokeSignoff, signItem } from '../../actions';
import { signersLabel, type ChecklistItem, type Progress } from '../../types';

export const dynamic = 'force-dynamic';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Only the member themselves and people who can see the member
          directory may read a checklist.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

/**
 * One line: what it is, who signed it and when, or a way to sign it.
 *
 * Signing is offered to everyone — the API decides whether this trainer holds
 * what the line calls for, and says so plainly if not. Hiding the control
 * from anyone who might not qualify would leave a trainer staring at a line
 * with no explanation of why they cannot sign it.
 */
function Line({
  item,
  templateId,
  memberId,
  hour12,
  viewerId,
  ownChecklist,
}: {
  item: ChecklistItem;
  templateId: number;
  memberId: number;
  hour12: boolean;
  viewerId: number | null;
  ownChecklist: boolean;
}) {
  if (item.scoreType === 'HEADING') {
    return (
      <h3 className="pt-2 text-sm font-semibold tracking-tight">
        {item.prompt}
      </h3>
    );
  }

  const signed = item.signoff;
  return (
    <div
      className={`rounded-md border p-4 ${
        signed ? 'border-emerald-600/40 bg-emerald-50/40 dark:bg-emerald-950/20' : ''
      }`}
    >
      <div className="flex flex-wrap items-start gap-2">
        <span aria-hidden className="pt-0.5 text-lg leading-none">
          {signed ? '☑' : '☐'}
        </span>
        <div className="min-w-64 flex-1 space-y-1">
          <p className="text-sm font-medium">{item.prompt}</p>
          {signed ? (
            <p className="text-xs text-muted-foreground">
              Signed by {signed.signedBy.firstName} {signed.signedBy.lastName} ·{' '}
              {formatDateTime(signed.signedAt, hour12)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {item.requires.length
                ? `Needs ${signersLabel(item.requires)}.`
                : 'Nobody can sign this: the checklist has no signing level.'}
            </p>
          )}
          {signed?.note ? (
            <p className="text-sm whitespace-pre-wrap">{signed.note}</p>
          ) : null}
        </div>
      </div>

      {signed ? (
        // Withdrawing is a second step: the button beside a completed line
        // should not be one click away from undoing it.
        <details className="mt-2 ml-7">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Withdraw this sign-off
          </summary>
          <form
            action={revokeSignoff.bind(null, templateId, memberId, signed.id)}
            className="mt-2 flex flex-wrap items-end gap-2"
          >
            <label className="grid flex-1 gap-1 text-xs text-muted-foreground">
              Why (optional — the member is told)
              <input
                name="reason"
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
              />
            </label>
            <Button type="submit" size="sm" variant="destructive">
              Withdraw
            </Button>
          </form>
        </details>
      ) : ownChecklist ? (
        <p className="mt-2 ml-7 text-xs text-muted-foreground">
          A trainer signs this off once they have seen you do it.
        </p>
      ) : viewerId ? (
        <form
          action={signItem.bind(null, templateId, memberId, item.id)}
          className="mt-2 ml-7 flex flex-wrap items-end gap-2"
        >
          <label className="grid flex-1 gap-1 text-xs text-muted-foreground">
            Note (optional)
            <input
              name="note"
              placeholder="Anything worth recording about how it went"
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
            />
          </label>
          <Button type="submit" size="sm">
            Sign off
          </Button>
        </form>
      ) : null}
    </div>
  );
}

export default async function ChecklistProgressPage({
  params,
  searchParams,
}: {
  params: Promise<{ templateId: string; memberId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ templateId, memberId }, { error }] = await Promise.all([
    params,
    searchParams,
  ]);
  const template = Number(templateId);
  const subject = Number(memberId);
  const [hour12, viewerId] = await Promise.all([
    prefers12Hour(),
    myMemberId(),
  ]);

  let progress: Progress;
  try {
    progress = await api<Progress>(
      `/v1/checklists/${template}/members/${subject}`,
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }
  const ownChecklist = viewerId === subject;

  const line = (item: ChecklistItem) => (
    <Line
      key={item.id}
      item={item}
      templateId={template}
      memberId={subject}
      hour12={hour12}
      viewerId={viewerId}
      ownChecklist={ownChecklist}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={progress.template.name}
        description={
          ownChecklist
            ? 'Your progress. Trainers sign each line as they see it done.'
            : `${progress.member.firstName} ${progress.member.lastName}`
        }
      />
      <ErrorBanner message={error} />

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={ownChecklist ? '/checklists' : `/checklists/${template}`}
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          &larr; Back
        </Link>
        <ProgressBar signed={progress.signed} total={progress.total} />
        {progress.complete ? <Badge>Complete</Badge> : null}
        {progress.leadsTo ? (
          <Badge variant="secondary">
            Required for {progress.leadsTo.name}
          </Badge>
        ) : null}
      </div>

      <div className="space-y-4">
        {formNodes(progress.items, progress.groups).map((node) =>
          node.kind === 'GROUP' ? (
            <FormGroup
              key={`g${node.group.id}`}
              heading={node.group.heading}
              description={node.group.description}
            >
              {node.group.items.map(line)}
            </FormGroup>
          ) : (
            line(node.item)
          ),
        )}
      </div>

      {progress.total === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            This checklist has no lines on it yet.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
