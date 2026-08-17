import Link from 'next/link';
import { summarizeCredentials } from '@/lib/credentials';
import { formatPosition, formatPositionShort } from '@/lib/positions';
import { myPermissions, prefers12Hour } from '@/lib/me';
import { notFound } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { formatCredKey, formatDateTime, formatEndTime } from '@/lib/format';
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
import {
  advanceWorkflow,
  dropFromEvent,
  respondAvailability,
  signupForEvent,
  signupOther,
  assignMember,
  removeMember,
  setEventLocked,
} from './actions';

type EventDetail = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  locked: boolean;
  attendeeCap: number | null;
  kind: { name: string };
  positions: Array<{
    position: string;
    count: number;
    requiredCredentialKey: string | null;
  }>;
  signups: Array<{
    position: string | null;
    member: { id: number; firstName: string; lastName: string };
  }>;
  eligiblePositions: string[];
  myPosition?: string | null;
  workflowStatus: string;
  tierId: number | null;
};

type AvailabilityResponse = {
  id: number;
  positions: string[];
  note: string | null;
  member: {
    id: number;
    firstName: string;
    lastName: string;
    credentials: Array<{ type: { key: string } }>;
  };
};

/** Legal workflow transitions per status; the API enforces permissions. */
const WORKFLOW_ACTIONS: Record<string, Array<{ action: string; label: string }>> =
  {
    DRAFT: [
      { action: 'REQUEST_AVAILABILITY', label: 'Request availability' },
      { action: 'SUBMIT_FOR_APPROVAL', label: 'Submit for approval' },
      { action: 'CANCEL', label: 'Cancel' },
    ],
    AVAILABILITY_REQUESTED: [
      { action: 'SUBMIT_FOR_APPROVAL', label: 'Submit for approval' },
      { action: 'CANCEL', label: 'Cancel' },
    ],
    PENDING_APPROVAL: [
      { action: 'APPROVE', label: 'Approve' },
      { action: 'DENY', label: 'Deny' },
      { action: 'CANCEL', label: 'Cancel' },
    ],
  };

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const hour12 = await prefers12Hour();
  const permissions = await myPermissions();
  const mayAssign = permissions.has('events:assign-others');
  const mayEdit = permissions.has('events:create');
  const mayLock = permissions.has('events:lock');
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const eventId = Number(id);
  if (!Number.isInteger(eventId)) notFound();

  let event: EventDetail;
  try {
    event = await api<EventDetail>(`/v1/events/${eventId}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  // Only fetched when there is a control that needs it.
  const roster = mayAssign
    ? await api<Array<{ id: number; firstName: string; lastName: string }>>(
        '/v1/members',
      )
    : [];

  const signedUp = event.myPosition !== undefined;
  const attendees = event.signups.filter((s) => !s.position);

  const showWorkflow =
    event.workflowStatus !== 'APPROVED' || event.tierId != null;
  const collectingAvailability =
    event.workflowStatus === 'AVAILABILITY_REQUESTED' ||
    event.workflowStatus === 'PENDING_APPROVAL';

  // Respondents are staff-only; a 403 just hides the section.
  let availability: AvailabilityResponse[] | null = null;
  if (showWorkflow) {
    try {
      availability = await api<AvailabilityResponse[]>(
        `/v1/events/${eventId}/availability`,
      );
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
    }
  }

  const workflowActions = WORKFLOW_ACTIONS[event.workflowStatus] ?? [];
  const showNotes = event.workflowStatus === 'PENDING_APPROVAL';

  return (
    <div className="space-y-6">
      <PageHeader
        title={event.title}
        description={`${formatDateTime(event.startsAt, hour12)} – ${formatEndTime(event.endsAt, hour12)}${
          event.location ? ` · ${event.location}` : ''
        }`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{event.kind.name}</Badge>
        {showWorkflow ? <WorkflowBadge status={event.workflowStatus} /> : null}
        {event.locked ? <Badge variant="outline">Signups locked</Badge> : null}
        {signedUp ? (
          <Badge>
            Signed up{event.myPosition ? ` — ${event.myPosition}` : ''}
          </Badge>
        ) : null}
      </div>
      <ErrorBanner message={error} />

      {event.description ? (
        <p className="max-w-prose text-sm text-muted-foreground">
          {event.description}
        </p>
      ) : null}

      {showWorkflow ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-base">
              Coverage workflow <WorkflowBadge status={event.workflowStatus} />
            </CardTitle>
          </CardHeader>
          {workflowActions.length ? (
            <CardContent>
              <form className="flex flex-wrap items-end gap-2">
                {showNotes ? (
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Notes (optional, shared with the requester)
                    <input
                      type="text"
                      name="notes"
                      className="h-8 w-72 rounded-md border border-input bg-background px-2 text-sm"
                    />
                  </label>
                ) : null}
                {workflowActions.map(({ action, label }) => (
                  <Button
                    key={action}
                    type="submit"
                    formAction={advanceWorkflow.bind(null, event.id, action)}
                    variant={
                      action === 'APPROVE'
                        ? 'default'
                        : action === 'DENY' || action === 'CANCEL'
                          ? 'ghost'
                          : 'outline'
                    }
                    size="sm"
                    className={
                      action === 'DENY' || action === 'CANCEL'
                        ? 'text-destructive'
                        : undefined
                    }
                  >
                    {label}
                  </Button>
                ))}
              </form>
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      {collectingAvailability ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">I can work this</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={respondAvailability.bind(null, event.id)}
              className="space-y-3"
            >
              <div className="flex flex-wrap gap-4">
                {event.positions.map((pos) => (
                  <label
                    key={pos.position}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="positions"
                      value={pos.position}
                      className="size-4"
                    />
                    {formatPosition(pos.position)}
                    {pos.requiredCredentialKey ? (
                      <span className="text-xs text-muted-foreground">
                        ({formatCredKey(pos.requiredCredentialKey)})
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  name="note"
                  placeholder="Note (optional)"
                  className="h-8 w-72 rounded-md border border-input bg-background px-2 text-sm"
                />
                <Button type="submit" size="sm">
                  Send availability
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {availability ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Availability responses</CardTitle>
          </CardHeader>
          <CardContent>
            {availability.length ? (
              <ul className="space-y-4">
                {availability.map((response) => (
                  <li key={response.id} className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">
                        {response.member.firstName} {response.member.lastName}
                      </span>
                      {summarizeCredentials(response.member.credentials).map((badge) => (
                        <Badge key={badge.key} variant="outline" title={badge.tooltip}>
                          {badge.label}
                        </Badge>
                      ))}
                    </div>
                    {response.note ? (
                      <p className="text-sm text-muted-foreground">
                        {response.note}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {response.positions.map((position) => (
                        <form
                          key={position}
                          action={signupOther.bind(
                            null,
                            event.id,
                            response.member.id,
                            position,
                          )}
                        >
                          <Button type="submit" variant="outline" size="sm">
                            Assign as {formatPositionShort(position)}
                          </Button>
                        </form>
                      ))}
                      {!response.positions.length ? (
                        <p className="text-sm text-muted-foreground italic">
                          No positions offered
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No availability responses yet.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {mayEdit || mayLock ? (
        <div className="flex flex-wrap items-center gap-3">
          {mayEdit ? (
            <Button
              render={<Link href={`/events/${eventId}/edit`} />}
              variant="outline"
              size="sm"
            >
              Edit event
            </Button>
          ) : null}
          {mayLock ? (
            <form action={setEventLocked.bind(null, eventId, !event.locked)}>
              <Button type="submit" variant="outline" size="sm">
                {event.locked ? 'Unlock signups' : 'Lock signups'}
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      {mayAssign ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assign a member</CardTitle>
            <CardDescription>
              Places anyone on this event directly, ignoring credential
              requirements and the signup lock — the assignment is yours to
              judge. Leave the position blank to add them as an attendee.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={assignMember.bind(null, eventId)}
              className="flex flex-wrap items-end gap-2"
            >
              <label className="grid gap-1 text-xs text-muted-foreground">
                Member
                <select
                  name="memberId"
                  required
                  defaultValue=""
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="" disabled>
                    Select member…
                  </option>
                  {roster.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.lastName}, {member.firstName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Position
                <select
                  name="position"
                  defaultValue=""
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">Attendee (no position)</option>
                  {event.positions.map((pos) => (
                    <option key={pos.position} value={pos.position}>
                      {formatPosition(pos.position)}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" size="sm" variant="outline" className="h-8">
                Assign
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roster</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {event.positions.map((pos) => {
            const filled = event.signups.filter(
              (s) => s.position === pos.position,
            );
            return (
              <div key={pos.position} className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {formatPosition(pos.position)}
                  <span className="text-xs text-muted-foreground">
                    {filled.length}/{pos.count}
                    {pos.requiredCredentialKey
                      ? ` · requires ${formatCredKey(pos.requiredCredentialKey)}`
                      : ''}
                  </span>
                </div>
                {filled.length ? (
                  <ul className="text-sm text-muted-foreground">
                    {filled.map((s) => (
                      <li key={s.member.id} className="flex items-center gap-2">
                        {s.member.firstName} {s.member.lastName}
                        {mayAssign ? (
                          <form
                            action={removeMember.bind(null, eventId, s.member.id)}
                          >
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-destructive"
                            >
                              remove
                            </Button>
                          </form>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Open</p>
                )}
              </div>
            );
          })}
          {event.attendeeCap !== -1 || attendees.length > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                Attendees
                <span className="text-xs text-muted-foreground">
                  {attendees.length}
                  {event.attendeeCap != null && event.attendeeCap > 0
                    ? `/${event.attendeeCap}`
                    : ''}
                </span>
              </div>
              {attendees.length ? (
                <ul className="text-sm text-muted-foreground">
                  {attendees.map((s) => (
                    <li key={s.member.id}>
                      {s.member.firstName} {s.member.lastName}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No attendees yet
                </p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!event.locked ? (
        <div className="flex flex-wrap items-center gap-2">
          {event.eligiblePositions.map((position) => (
            <form
              key={position}
              action={signupForEvent.bind(null, event.id, position)}
            >
              <Button type="submit" variant="outline" size="sm">
                Sign up as {formatPositionShort(position)}
              </Button>
            </form>
          ))}
          {event.attendeeCap !== -1 && event.myPosition !== null ? (
            <form action={signupForEvent.bind(null, event.id, null)}>
              <Button type="submit" variant="outline" size="sm">
                Attend
              </Button>
            </form>
          ) : null}
          {signedUp ? (
            <form action={dropFromEvent.bind(null, event.id)}>
              <Button type="submit" variant="ghost" size="sm">
                Drop
              </Button>
            </form>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Signups for this event are locked.
        </p>
      )}
    </div>
  );
}
