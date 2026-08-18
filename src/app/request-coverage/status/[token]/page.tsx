import { notFound } from 'next/navigation';
import { prefers12Hour } from '@/lib/me';
import { formatDate, formatDateOnly, formatDateTime, formatEndTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ErrorBanner } from '@/components/error-banner';
import { WorkflowBadge, WORKFLOW_LABELS } from '@/components/workflow-badge';
import { sendRequesterReply } from './actions';

const API_URL = process.env.RAMPART_API_URL ?? 'http://localhost:3001';

type StatusResponse = {
  status: string;
  requesterName: string;
  description: string;
  requestedDate: string | null;
  location: string | null;
  createdAt: string;
  event: {
    workflowStatus: string;
    title: string;
    startsAt: string;
    endsAt: string;
    location: string | null;
  } | null;
  messages: Array<{
    direction: 'FROM_REQUESTER' | 'TO_REQUESTER';
    body: string;
    createdAt: string;
  }>;
};

const TIMELINE = [
  'RECEIVED',
  'DRAFT',
  'AVAILABILITY_REQUESTED',
  'PENDING_APPROVAL',
] as const;

function StatusTimeline({ status }: { status: string }) {
  const terminal =
    status === 'APPROVED' || status === 'DENIED' || status === 'CANCELLED';
  const currentIndex = terminal
    ? TIMELINE.length
    : TIMELINE.indexOf(status as (typeof TIMELINE)[number]);
  const steps: string[] = [...TIMELINE, terminal ? status : 'APPROVED'];

  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {steps.map((step, i) => {
        const reached = i <= currentIndex;
        const isCurrent = terminal ? i === currentIndex : step === status;
        return (
          <li key={step} className="flex items-center gap-2">
            {i > 0 ? <span className="text-muted-foreground">&rarr;</span> : null}
            <span
              className={
                isCurrent
                  ? step === 'DENIED' || step === 'CANCELLED'
                    ? 'rounded-full bg-destructive/10 px-2.5 py-1 font-medium text-destructive'
                    : 'rounded-full bg-primary px-2.5 py-1 font-medium text-primary-foreground'
                  : reached
                    ? 'rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground'
                    : 'rounded-full border px-2.5 py-1 text-muted-foreground'
              }
            >
              {WORKFLOW_LABELS[step] ?? step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default async function CoverageStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const hour12 = await prefers12Hour();
  const [{ token }, { error }] = await Promise.all([params, searchParams]);

  const res = await fetch(
    `${API_URL}/v1/coverage-requests/status/${encodeURIComponent(token)}`,
    { cache: 'no-store' },
  );
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`Coverage status request failed (${res.status})`);
  const request = (await res.json()) as StatusResponse;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Your coverage request
        </h1>
        <p className="text-sm text-muted-foreground">
          Submitted {formatDateTime(request.createdAt, hour12)} by{' '}
          {request.requesterName}. Bookmark this page — it&apos;s your window
          into the request.
        </p>
      </div>
      <ErrorBanner message={error} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-base">
            Status <WorkflowBadge status={request.status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <StatusTimeline status={request.status} />
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="font-medium">Request</dt>
              <dd className="whitespace-pre-wrap text-muted-foreground">
                {request.description}
              </dd>
            </div>
            {request.requestedDate ? (
              <div>
                <dt className="font-medium">Requested date</dt>
                <dd className="text-muted-foreground">
                  {formatDateOnly(request.requestedDate)}
                </dd>
              </div>
            ) : null}
            {request.location ? (
              <div>
                <dt className="font-medium">Location</dt>
                <dd className="text-muted-foreground">{request.location}</dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      {request.event ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Planned event</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="font-medium">Title</dt>
                <dd className="text-muted-foreground">{request.event.title}</dd>
              </div>
              <div>
                <dt className="font-medium">When</dt>
                <dd className="text-muted-foreground">
                  {formatDateTime(request.event.startsAt, hour12)} –{' '}
                  {formatEndTime(request.event.endsAt, hour12)}
                </dd>
              </div>
              {request.event.location ? (
                <div>
                  <dt className="font-medium">Where</dt>
                  <dd className="text-muted-foreground">
                    {request.event.location}
                  </dd>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Messages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {request.messages.length ? (
            <ul className="space-y-3">
              {request.messages.map((message, i) => {
                const fromRequester = message.direction === 'FROM_REQUESTER';
                return (
                  <li
                    key={i}
                    className={`flex ${fromRequester ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        fromRequester
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.body}</p>
                      <p
                        className={`mt-1 text-xs ${
                          fromRequester
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {fromRequester ? 'You' : 'RPI Ambulance'} ·{' '}
                        {formatDateTime(message.createdAt, hour12)}
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
            action={sendRequesterReply.bind(null, token)}
            className="grid gap-2"
          >
            <textarea
              name="body"
              required
              maxLength={4000}
              rows={3}
              placeholder="Send a message to RPI Ambulance…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button type="submit" size="sm" className="justify-self-end">
              Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
