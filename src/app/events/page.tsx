import Link from 'next/link';
import { api } from '@/lib/api';
import { dayKey, formatDate, formatTime } from '@/lib/format';
import { kindStyle } from '@/lib/event-kinds';
import {
  addDays,
  step,
  todayNY,
  viewRange,
  viewTitle,
  type CalendarView,
} from '@/lib/calendar';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import {
  CalendarLegend,
  EventCalendar,
  type CalendarEvent,
} from '@/components/calendar/event-calendar';
import { cn } from '@/lib/utils';

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

const VIEWS: Array<{ key: 'list' | CalendarView; label: string }> = [
  { key: 'list', label: 'Upcoming' },
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

function linkTo(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `/events?${query}` : '/events';
}

const tabCls = (active: boolean) =>
  cn(
    'inline-flex h-8 items-center rounded-md px-3 text-sm',
    active
      ? 'bg-secondary font-medium text-secondary-foreground'
      : 'text-muted-foreground hover:text-foreground',
  );

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    date?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const params = await searchParams;
  const view = (
    ['day', 'week', 'month'].includes(params.view ?? '') ? params.view : 'list'
  ) as 'list' | CalendarView;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? '')
    ? params.date!
    : todayNY();

  if (view !== 'list') {
    // Calendars show whatever falls in the period, past included.
    const { from, to } = viewRange(view, date);
    const events = await api<EventSummary[]>(rangeQuery(from, to));
    const calendarEvents: CalendarEvent[] = events
      .map((event) => ({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        location: event.location,
        kind: event.kind,
        day: dayKey(event.startsAt),
      }))
      // The fetch is deliberately wider than the period (see rangeQuery);
      // keep only what actually lands on a day this view shows.
      .filter((event) => event.day >= from && event.day <= to);

    return (
      <div className="space-y-6">
        <EventsHeader />
        <ViewTabs view={view} date={date} />
        <div className="flex flex-wrap items-center gap-3">
          <Link href={linkTo({ view, date: step(view, date, -1) })} className={tabCls(false)}>
            &larr; Previous
          </Link>
          <Link href={linkTo({ view })} className={tabCls(false)}>
            Today
          </Link>
          <Link href={linkTo({ view, date: step(view, date, 1) })} className={tabCls(false)}>
            Next &rarr;
          </Link>
          <span className="text-sm font-medium">{viewTitle(view, date)}</span>
        </div>
        <CalendarLegend kinds={[...new Set(events.map((e) => e.kind.name))]} />
        <EventCalendar view={view} date={date} events={calendarEvents} />
      </div>
    );
  }

  // Upcoming list, paginated.
  const pageSize = PAGE_SIZES.includes(Number(params.pageSize))
    ? Number(params.pageSize)
    : DEFAULT_PAGE_SIZE;
  const page = Math.max(1, Number(params.page) || 1);

  const upcoming = await api<EventSummary[]>(
    `/v1/events?from=${encodeURIComponent(new Date().toISOString())}`,
  );
  const pageCount = Math.max(1, Math.ceil(upcoming.length / pageSize));
  const current = Math.min(page, pageCount);
  const slice = upcoming.slice((current - 1) * pageSize, current * pageSize);

  const groups = new Map<string, EventSummary[]>();
  for (const event of slice) {
    const key = dayKey(event.startsAt);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  return (
    <div className="space-y-6">
      <EventsHeader />
      <ViewTabs view={view} date={date} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {upcoming.length} upcoming event{upcoming.length === 1 ? '' : 's'}
          {pageCount > 1 ? ` · page ${current} of ${pageCount}` : ''}
        </p>
        <form method="get" className="flex items-center gap-2">
          <input type="hidden" name="view" value="list" />
          <label className="text-xs text-muted-foreground">
            Per page
            <select
              name="pageSize"
              defaultValue={String(pageSize)}
              className="ml-2 h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-8 rounded-md border px-3 text-sm hover:bg-muted"
          >
            Apply
          </button>
        </form>
      </div>

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
                        <span
                          className={cn(
                            'size-2.5 shrink-0 rounded-full',
                            kindStyle(event.kind.name).dot,
                          )}
                        />
                        <CardTitle className="text-base">{event.title}</CardTitle>
                        <Badge variant="secondary">{event.kind.name}</Badge>
                        {event.locked ? (
                          <Badge variant="outline">Locked</Badge>
                        ) : null}
                      </div>
                      <CardDescription>
                        {formatTime(event.startsAt)} – {formatTime(event.endsAt)}
                        {event.location ? ` · ${event.location}` : ''}
                        {` · ${event._count.signups} signed up`}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}

      {pageCount > 1 ? (
        <div className="flex items-center gap-3">
          {current > 1 ? (
            <Link
              href={linkTo({ view: 'list', page: current - 1, pageSize })}
              className={tabCls(false)}
            >
              &larr; Newer
            </Link>
          ) : null}
          {current < pageCount ? (
            <Link
              href={linkTo({ view: 'list', page: current + 1, pageSize })}
              className={tabCls(false)}
            >
              Older &rarr;
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EventsHeader() {
  return (
    <>
      <PageHeader
        title="Events"
        description="Agency events, standbys, and trainings."
      />
      <Link
        href="/events/new"
        className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        + New event
      </Link>
    </>
  );
}

function ViewTabs({ view, date }: { view: string; date: string }) {
  return (
    <nav className="flex flex-wrap gap-1">
      {VIEWS.map((entry) => (
        <Link
          key={entry.key}
          href={linkTo({
            view: entry.key === 'list' ? undefined : entry.key,
            date: entry.key === 'list' ? undefined : date,
          })}
          className={tabCls(view === entry.key)}
        >
          {entry.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Range query for a calendar period. The API filters on UTC instants while the
 * period is a range of New York calendar days, and the offset between them
 * changes with DST — so ask for a day's slack at each end and let the caller
 * drop anything that falls outside once converted.
 */
function rangeQuery(from: string, to: string): string {
  const fromIso = `${addDays(from, -1)}T00:00:00.000Z`;
  const toIso = `${addDays(to, 2)}T00:00:00.000Z`;
  return `/v1/events?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
}
