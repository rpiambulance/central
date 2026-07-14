import { notFound } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { formatDateTime, formatTime } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ErrorBanner } from '@/components/error-banner';
import { PageHeader } from '@/components/page-header';
import { dropFromEvent, signupForEvent } from './actions';

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
};

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
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

  const signedUp = event.myPosition !== undefined;
  const attendees = event.signups.filter((s) => !s.position);

  return (
    <div className="space-y-6">
      <PageHeader
        title={event.title}
        description={`${formatDateTime(event.startsAt)} – ${formatTime(event.endsAt)}${
          event.location ? ` · ${event.location}` : ''
        }`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{event.kind.name}</Badge>
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
                  {pos.position}
                  <span className="text-xs text-muted-foreground">
                    {filled.length}/{pos.count}
                    {pos.requiredCredentialKey
                      ? ` · requires ${pos.requiredCredentialKey}`
                      : ''}
                  </span>
                </div>
                {filled.length ? (
                  <ul className="text-sm text-muted-foreground">
                    {filled.map((s) => (
                      <li key={s.member.id}>
                        {s.member.firstName} {s.member.lastName}
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
                Sign up as {position}
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
