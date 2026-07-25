import Link from 'next/link';
import { api } from '@/lib/api';
import { dayKey, formatDate, formatTime } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';

type EventSummary = {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  kind: { name: string };
  positions: Array<{ position: string; count: number }>;
  _count: { signups: number };
  locked: boolean;
};

export default async function EventsPage() {
  const events = await api<EventSummary[]>(
    `/v1/events?from=${encodeURIComponent(new Date().toISOString())}`,
  );

  const groups = new Map<string, EventSummary[]>();
  for (const event of events) {
    const key = dayKey(event.startsAt);
    const group = groups.get(key);
    if (group) group.push(event);
    else groups.set(key, [event]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        description="Upcoming agency events, standbys, and trainings."
      />
      <Link
        href="/events/new"
        className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        + New event
      </Link>
      {groups.size === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming events.</p>
      ) : (
        [...groups.entries()].map(([key, group]) => (
          <section key={key} className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              {formatDate(group[0].startsAt)}
            </h2>
            <div className="grid gap-3">
              {group.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardHeader>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">
                          {event.title}
                        </CardTitle>
                        <Badge variant="secondary">{event.kind.name}</Badge>
                        {event.locked ? (
                          <Badge variant="outline">Locked</Badge>
                        ) : null}
                      </div>
                      <CardDescription>
                        {formatTime(event.startsAt)} &ndash;{' '}
                        {formatTime(event.endsAt)}
                        {event.location ? <> &middot; {event.location}</> : null}
                        {' '}&middot; {event._count.signups} signed up
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
