import Link from 'next/link';
import { formatTime } from '@/lib/format';
import { kindStyle, COLORED_KINDS } from '@/lib/event-kinds';
import {
  addDays,
  isSameMonth,
  monthGrid,
  startOfWeek,
  todayNY,
  WEEKDAY_LABELS,
  type CalendarView,
} from '@/lib/calendar';
import { cn } from '@/lib/utils';

export interface CalendarEvent {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  kind: { name: string };
  /** YYYY-MM-DD in America/New_York, precomputed by the page. */
  day: string;
}

function EventChip({ event, hour12 }: { event: CalendarEvent; hour12: boolean }) {
  const style = kindStyle(event.kind.name);
  return (
    <Link
      href={`/events/${event.id}`}
      title={`${event.title} · ${formatTime(event.startsAt, hour12)}`}
      className={cn(
        'block truncate rounded border px-1 py-0.5 text-[11px] leading-tight hover:opacity-80',
        style.block,
      )}
    >
      {formatTime(event.startsAt, hour12)} {event.title}
    </Link>
  );
}

function EventRow({ event, hour12 }: { event: CalendarEvent; hour12: boolean }) {
  const style = kindStyle(event.kind.name);
  return (
    <Link
      href={`/events/${event.id}`}
      className={cn(
        'block rounded-r border-l-4 px-3 py-2 text-sm hover:opacity-90',
        style.bar,
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-medium">{event.title}</span>
        <span className="text-xs text-muted-foreground">
          {formatTime(event.startsAt, hour12)} – {formatTime(event.endsAt, hour12)}
          {event.location ? ` · ${event.location}` : ''}
        </span>
      </div>
      <span className="text-xs text-muted-foreground">{event.kind.name}</span>
    </Link>
  );
}

export function CalendarLegend({ kinds }: { kinds: string[] }) {
  // Show the seeded kinds plus whatever else actually appears.
  const shown = [...new Set([...COLORED_KINDS, ...kinds])];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {shown.map((kind) => (
        <span key={kind} className="flex items-center gap-1.5">
          <span className={cn('size-2.5 rounded-full', kindStyle(kind).dot)} />
          {kind}
        </span>
      ))}
    </div>
  );
}

function byDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    map.set(event.day, [...(map.get(event.day) ?? []), event]);
  }
  return map;
}

function MonthView({
  date,
  events,
  hour12,
}: {
  date: string;
  events: CalendarEvent[];
  hour12: boolean;
}) {
  const grid = monthGrid(date);
  const grouped = byDay(events);
  const today = todayNY();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[44rem] rounded-md border">
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="px-2 py-1.5 text-xs font-medium text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>
        {grid.map((week) => (
          <div key={week[0]} className="grid grid-cols-7 border-b last:border-b-0">
            {week.map((day) => {
              const dayEvents = grouped.get(day) ?? [];
              return (
                <div
                  key={day}
                  className={cn(
                    'min-h-24 space-y-0.5 border-r p-1 last:border-r-0',
                    // Days spilling in from the neighboring months stay
                    // visible but recede.
                    isSameMonth(day, date) ? '' : 'bg-muted/30 opacity-60',
                  )}
                >
                  <div
                    className={cn(
                      'px-1 text-xs',
                      day === today
                        ? 'font-semibold text-primary'
                        : 'text-muted-foreground',
                    )}
                  >
                    {Number(day.slice(8, 10))}
                  </div>
                  {dayEvents.map((event) => (
                    <EventChip key={event.id} event={event} hour12={hour12} />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekView({
  date,
  events,
  hour12,
}: {
  date: string;
  events: CalendarEvent[];
  hour12: boolean;
}) {
  const start = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const grouped = byDay(events);
  const today = todayNY();

  return (
    <div className="space-y-3">
      {days.map((day) => {
        const dayEvents = grouped.get(day) ?? [];
        const [y, m, d] = day.split('-').map(Number);
        const label = new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        }).format(new Date(Date.UTC(y, m - 1, d)));
        return (
          <section key={day} className="space-y-1.5">
            <h3
              className={cn(
                'text-sm font-medium',
                day === today ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {label}
              {day === today ? ' · today' : ''}
            </h3>
            {dayEvents.length ? (
              <div className="space-y-1.5">
                {dayEvents.map((event) => (
                  <EventRow key={event.id} event={event} hour12={hour12} />
                ))}
              </div>
            ) : (
              <p className="pl-3 text-xs text-muted-foreground">Nothing scheduled.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function DayView({ events, hour12 }: { events: CalendarEvent[]; hour12: boolean }) {
  if (!events.length) {
    return (
      <p className="rounded-md border px-3 py-8 text-center text-sm text-muted-foreground">
        Nothing scheduled.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {events.map((event) => (
        <EventRow key={event.id} event={event} hour12={hour12} />
      ))}
    </div>
  );
}

export function EventCalendar({
  view,
  date,
  events,
  hour12,
}: {
  view: CalendarView;
  date: string;
  events: CalendarEvent[];
  hour12: boolean;
}) {
  if (view === 'month')
    return <MonthView date={date} events={events} hour12={hour12} />;
  if (view === 'week')
    return <WeekView date={date} events={events} hour12={hour12} />;
  return <DayView events={events} hour12={hour12} />;
}
