import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
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

type PromotionPath = {
  credentialTypeId: number;
  key: string;
  name: string;
  requestable: boolean;
  checklist: Array<{ satisfied: boolean }>;
};

type RequestStatus =
  | 'PENDING'
  | 'IN_VOTE'
  | 'TC_APPROVED'
  | 'APPROVED'
  | 'DENIED'
  | 'WITHDRAWN';

type PromotionRequest = {
  id: number;
  status: RequestStatus;
  createdAt: string;
  member: { id: number; firstName: string; lastName: string };
  credentialType: { id: number; name: string };
  votes: Array<{ id: number }>;
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

export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, paths] = await Promise.all([
    searchParams,
    api<PromotionPath[]>('/v1/promotions/eligible'),
  ]);

  // The review queue requires promotions:review; hide it otherwise.
  let requests: PromotionRequest[] | null = null;
  try {
    requests = await api<PromotionRequest[]>('/v1/promotions/requests');
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      requests = null;
    } else {
      throw err;
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Promotions"
        description="Your promotion progress and the Training Committee review queue."
      />
      <ErrorBanner message={error} />

      <section className="space-y-2">
        <h2 className="text-lg font-medium tracking-tight">
          My promotion requests
        </h2>
        {paths.length ? (
          <ul className="space-y-1 text-sm">
            {paths.map((path) => (
              <li key={path.credentialTypeId}>
                <span className="font-medium">{path.name}</span>{' '}
                <span className="text-muted-foreground">
                  — {path.checklist.filter((i) => i.satisfied).length}/
                  {path.checklist.length} requirements met
                  {path.requestable ? ', ready to request' : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No promotion paths available right now.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          View requirement details and request a promotion on{' '}
          <Link
            href="/training"
            className="underline underline-offset-2 hover:text-foreground"
          >
            My Training
          </Link>
          .
        </p>
      </section>

      {requests ? (
        <section className="space-y-2">
          <h2 className="text-lg font-medium tracking-tight">Review queue</h2>
          {requests.length ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Credential</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Votes</TableHead>
                    <TableHead>Requested</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => {
                    const badge = STATUS_BADGE[request.status];
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          <Link
                            href={`/promotions/${request.id}`}
                            className="underline underline-offset-2 hover:text-foreground"
                          >
                            {request.member.lastName},{' '}
                            {request.member.firstName}
                          </Link>
                        </TableCell>
                        <TableCell>{request.credentialType.name}</TableCell>
                        <TableCell>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell>{request.votes.length}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(request.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No promotion requests to review.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
