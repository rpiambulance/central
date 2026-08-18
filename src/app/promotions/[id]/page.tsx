import Link from 'next/link';
import { prefers12Hour } from '@/lib/me';
import { api, ApiError } from '@/lib/api';
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
import { appointProxy, captainDecision, castVote } from './actions';

type MemberRef = { id: number; firstName: string; lastName: string };

type RequestStatus =
  | 'PENDING'
  | 'IN_VOTE'
  | 'TC_APPROVED'
  | 'APPROVED'
  | 'DENIED'
  | 'WITHDRAWN';

type Review = {
  id: number;
  status: RequestStatus;
  createdAt: string;
  member: MemberRef;
  credentialType: { id: number; name: string; key: string };
  checklist: Array<{
    kind: string;
    label: string;
    satisfied: boolean;
    detail?: string;
  }>;
  evaluations: Array<{
    id: number;
    createdAt: string;
    shiftDate: string | null;
    template: { id: number; name: string };
    evaluator: MemberRef;
  }>;
  votes: Array<{
    id: number;
    vote: 'APPROVE' | 'DENY';
    notes: string | null;
    castAt: string;
    voter: MemberRef;
    proxyFor: MemberRef | null;
  }>;
  proxies: Array<{
    id: number;
    principal: MemberRef;
    proxy: MemberRef;
  }>;
  captainApproval: {
    approved: boolean;
    notes: string | null;
  } | null;
  committee: number[];
};

const STATUS_BADGE: Record<
  RequestStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  PENDING: { label: 'Pending', variant: 'outline' },
  IN_VOTE: { label: 'In vote', variant: 'secondary' },
  TC_APPROVED: { label: 'TC approved', variant: 'secondary' },
  APPROVED: { label: 'Approved', variant: 'default' },
  DENIED: { label: 'Denied', variant: 'destructive' },
  WITHDRAWN: { label: 'Withdrawn', variant: 'outline' },
};

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Reviewing promotion requests requires additional permissions. If you
          think you should have access, contact an officer.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function memberName(m: MemberRef) {
  return `${m.firstName} ${m.lastName}`;
}

export default async function PromotionReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const hour12 = await prefers12Hour();
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const requestId = Number(id);

  let review: Review;
  try {
    review = await api<Review>(`/v1/promotions/requests/${requestId}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  let members: MemberRef[] | null = null;
  try {
    members = await api<MemberRef[]>('/v1/members');
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      members = null;
    } else {
      throw err;
    }
  }

  const badge = STATUS_BADGE[review.status];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${memberName(review.member)} → ${review.credentialType.name}`}
        description={`Promotion request #${review.id}, opened ${formatDate(review.createdAt)}.`}
      />
      <ErrorBanner message={error} />

      <div className="flex items-center gap-2">
        <Badge variant={badge.variant}>{badge.label}</Badge>
        {review.captainApproval ? (
          <span className="text-sm text-muted-foreground">
            Captain {review.captainApproval.approved ? 'approved' : 'denied'}
            {review.captainApproval.notes
              ? ` — ${review.captainApproval.notes}`
              : ''}
          </span>
        ) : null}
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-medium tracking-tight">
          Requirement checklist
        </h2>
        <ul className="space-y-1 text-sm">
          {review.checklist.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                aria-hidden
                className={
                  item.satisfied
                    ? 'text-green-600 dark:text-green-500'
                    : 'text-destructive'
                }
              >
                {item.satisfied ? '✓' : '✗'}
              </span>
              <span className={item.satisfied ? '' : 'text-muted-foreground'}>
                {item.label}
                {item.detail ? (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({item.detail})
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium tracking-tight">
          Signed evaluations
        </h2>
        {review.evaluations.length ? (
          <ul className="space-y-1 text-sm">
            {review.evaluations.map((ev) => (
              <li key={ev.id}>
                <Link
                  href={`/evals/${ev.id}`}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  {ev.template.name}
                </Link>{' '}
                <span className="text-muted-foreground">
                  by {memberName(ev.evaluator)},{' '}
                  {ev.shiftDate ? formatDateOnly(ev.shiftDate) : formatDate(ev.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No signed evaluations on file.
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium tracking-tight">Vote record</h2>
        <p className="text-sm text-muted-foreground">
          {review.committee.length} Training Committee member
          {review.committee.length === 1 ? '' : 's'} must vote unanimously.
        </p>
        {review.votes.length ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voter</TableHead>
                  <TableHead>Vote</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Cast</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {review.votes.map((vote) => (
                  <TableRow key={vote.id}>
                    <TableCell className="font-medium">
                      {memberName(vote.voter)}
                      {vote.proxyFor ? (
                        <span className="block text-xs text-muted-foreground">
                          voting as proxy for {memberName(vote.proxyFor)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          vote.vote === 'APPROVE' ? 'default' : 'destructive'
                        }
                      >
                        {vote.vote === 'APPROVE' ? 'Approve' : 'Deny'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {vote.notes ?? (
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(vote.castAt, hour12)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No votes cast yet.</p>
        )}
        {review.proxies.length ? (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {review.proxies.map((proxy) => (
              <li key={proxy.id}>
                {memberName(proxy.principal)} appointed{' '}
                {memberName(proxy.proxy)} as proxy.
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cast your vote</CardTitle>
            <CardDescription>
              Training Committee members and appointed proxies only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={castVote.bind(null, review.id)} className="space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="vote" value="APPROVE" required />
                  Approve
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="vote" value="DENY" />
                  Deny
                </label>
              </div>
              <textarea
                name="notes"
                rows={2}
                placeholder="Notes (optional)"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <Button type="submit" size="sm">
                Cast vote
              </Button>
            </form>
          </CardContent>
        </Card>

        {members ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appoint a proxy</CardTitle>
              <CardDescription>
                Conflicted committee members appoint a non-committee member to
                vote in their place.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={appointProxy.bind(null, review.id)}
                className="flex items-end gap-3"
              >
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">Proxy</span>
                  <select
                    name="proxyId"
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
                <Button type="submit" size="sm" variant="outline">
                  Appoint
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {review.status === 'TC_APPROVED' ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Captain decision</CardTitle>
              <CardDescription>
                Final approval grants the credential automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={captainDecision.bind(null, review.id)}
                className="space-y-3"
              >
                <div className="flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="approved"
                      value="true"
                      required
                    />
                    Approve
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" name="approved" value="false" />
                    Deny
                  </label>
                </div>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Notes (optional)"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <Button type="submit" size="sm">
                  Record decision
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
