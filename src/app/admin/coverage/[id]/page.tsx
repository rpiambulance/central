import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
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
import { WorkflowBadge } from '@/components/workflow-badge';
import { draftEvent, messageRequester } from './actions';

type CoverageRequestDetail = {
  id: number;
  requesterName: string;
  requesterOrg: string | null;
  requesterEmail: string;
  requesterPhone: string | null;
  description: string;
  requestedDate: string | null;
  location: string | null;
  createdAt: string;
  status: string;
  event: {
    id: number;
    title: string;
    workflowStatus: string;
    startsAt: string;
    endsAt: string;
    location: string | null;
    positions: Array<{
      position: string;
      count: number;
      requiredCredentialKey: string | null;
    }>;
    tier: { id: number; name: string } | null;
  } | null;
  messages: Array<{
    id: number;
    direction: 'FROM_REQUESTER' | 'TO_REQUESTER';
    body: string;
    createdAt: string;
    author: { id: number; firstName: string; lastName: string } | null;
  }>;
};

type EventKind = { id: number; name: string };
type EventTier = { id: number; name: string };
type CredentialType = { id: number; key: string; name: string };

const inputCls =
  'h-8 rounded-md border border-input bg-background px-2 text-sm';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Coverage requests require additional permissions. If you think you
          should have access, contact an officer.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function Dash() {
  return <span className="text-muted-foreground">&mdash;</span>;
}

export default async function AdminCoverageDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const requestId = Number(id);
  if (!Number.isInteger(requestId)) notFound();

  let request: CoverageRequestDetail;
  let kinds: EventKind[] = [];
  let tiers: EventTier[] = [];
  let credentialTypes: CredentialType[] = [];
  try {
    request = await api<CoverageRequestDetail>(
      `/v1/coverage-requests/${requestId}`,
    );
    if (!request.event) {
      [kinds, tiers, credentialTypes] = await Promise.all([
        api<EventKind[]>('/v1/events/kinds'),
        api<EventTier[]>('/v1/events/tiers'),
        api<CredentialType[]>('/v1/credentials/types'),
      ]);
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Coverage request #${request.id}`}
        description={`Received ${formatDateTime(request.createdAt)}`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <WorkflowBadge status={request.status} />
      </div>
      <ErrorBanner message={error} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requester</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="font-medium">Name</dt>
                <dd className="text-muted-foreground">
                  {request.requesterName}
                  {request.requesterOrg ? ` — ${request.requesterOrg}` : ''}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Email</dt>
                <dd className="text-muted-foreground">
                  <a
                    href={`mailto:${request.requesterEmail}`}
                    className="underline underline-offset-2"
                  >
                    {request.requesterEmail}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-medium">Phone</dt>
                <dd className="text-muted-foreground">
                  {request.requesterPhone ?? <Dash />}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Requested date</dt>
                <dd className="text-muted-foreground">
                  {request.requestedDate ? (
                    formatDate(request.requestedDate)
                  ) : (
                    <Dash />
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Location</dt>
                <dd className="text-muted-foreground">
                  {request.location ?? <Dash />}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Request</dt>
                <dd className="whitespace-pre-wrap text-muted-foreground">
                  {request.description}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Messages</CardTitle>
            <CardDescription>
              Replies here are emailed to the requester.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {request.messages.length ? (
              <ul className="space-y-3">
                {request.messages.map((message) => {
                  const fromRequester = message.direction === 'FROM_REQUESTER';
                  return (
                    <li
                      key={message.id}
                      className={`flex ${fromRequester ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          fromRequester
                            ? 'bg-muted'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.body}</p>
                        <p
                          className={`mt-1 text-xs ${
                            fromRequester
                              ? 'text-muted-foreground'
                              : 'text-primary-foreground/70'
                          }`}
                        >
                          {fromRequester
                            ? request.requesterName
                            : message.author
                              ? `${message.author.firstName} ${message.author.lastName}`
                              : 'RPI Ambulance'}{' '}
                          · {formatDateTime(message.createdAt)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No messages yet.</p>
            )}
            <form
              action={messageRequester.bind(null, request.id)}
              className="grid gap-2"
            >
              <textarea
                name="body"
                required
                maxLength={4000}
                rows={3}
                placeholder="Ask the requester a question…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <Button type="submit" size="sm" className="justify-self-end">
                Ask the requester
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {request.event ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-base">
              Event <WorkflowBadge status={request.event.workflowStatus} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <Link
                href={`/events/${request.event.id}`}
                className="font-medium underline underline-offset-2"
              >
                {request.event.title}
              </Link>{' '}
              <span className="text-muted-foreground">
                {formatDateTime(request.event.startsAt)}
                {request.event.location ? ` · ${request.event.location}` : ''}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {request.event.tier ? (
                <Badge variant="secondary">Tier: {request.event.tier.name}</Badge>
              ) : null}
              {request.event.positions.map((pos) => (
                <Badge key={pos.position} variant="outline">
                  {pos.position} ×{pos.count}
                  {pos.requiredCredentialKey
                    ? ` (${pos.requiredCredentialKey})`
                    : ''}
                </Badge>
              ))}
            </div>
            <p className="text-muted-foreground">
              Manage the workflow from the{' '}
              <Link
                href={`/events/${request.event.id}`}
                className="underline underline-offset-2"
              >
                event page
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Draft the event</CardTitle>
            <CardDescription>
              Creates a hidden draft event linked to this request. It stays off
              the public calendar until approved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={draftEvent.bind(null, request.id)}
              className="grid gap-4"
            >
              <div className="flex flex-wrap items-end gap-3">
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Title
                  <input
                    type="text"
                    name="title"
                    required
                    defaultValue={
                      request.requesterOrg
                        ? `${request.requesterOrg} coverage`
                        : ''
                    }
                    className={`${inputCls} w-64`}
                  />
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Kind
                  <select
                    name="kindId"
                    required
                    defaultValue=""
                    className={inputCls}
                  >
                    <option value="" disabled>
                      Select kind…
                    </option>
                    {kinds.map((kind) => (
                      <option key={kind.id} value={kind.id}>
                        {kind.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Tier
                  <select name="tierId" defaultValue="" className={inputCls}>
                    <option value="">No tier</option>
                    {tiers.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Starts
                  <input
                    type="datetime-local"
                    name="startsAt"
                    required
                    className={inputCls}
                  />
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Ends
                  <input
                    type="datetime-local"
                    name="endsAt"
                    required
                    className={inputCls}
                  />
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Location
                  <input
                    type="text"
                    name="location"
                    defaultValue={request.location ?? ''}
                    className={`${inputCls} w-56`}
                  />
                </label>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Positions (leave rows blank to skip)
                </p>
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      name={`position-${i}`}
                      placeholder="Position name"
                      className={`${inputCls} w-48`}
                    />
                    <input
                      type="number"
                      name={`count-${i}`}
                      min={1}
                      placeholder="Count"
                      className={`${inputCls} w-20`}
                    />
                    <select
                      name={`credential-${i}`}
                      defaultValue=""
                      className={inputCls}
                    >
                      <option value="">No required credential</option>
                      {credentialTypes.map((type) => (
                        <option key={type.id} value={type.key}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <Button type="submit" className="justify-self-start">
                Draft the event
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
