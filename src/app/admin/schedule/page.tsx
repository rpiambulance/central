import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { formatDay } from '@/lib/format';
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
import { OutOfServiceToggle } from './out-of-service';
import { SlotSelect } from './slot-select';
import { bulkWeek } from './actions';
import { UndoButton } from './undo-button';
import { UndoProvider } from './undo-context';
import { TooltipProvider } from '@/components/ui/tooltip';

const POSITIONS = ['CC', 'DRIVER', 'ATTENDANT', 'OBSERVER', 'DUTY_SUP'] as const;
type Position = (typeof POSITIONS)[number];

const COLUMN_LABELS: Record<Position, string> = {
  CC: 'Crew Chief',
  DRIVER: 'Driver',
  ATTENDANT: 'Rider',
  OBSERVER: 'Rider 2',
  DUTY_SUP: 'Duty Supervisor',
};

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

type Member = {
  id: number;
  firstName: string;
  lastName: string;
  /** Crew positions this member holds the credentials for. */
  positions: string[];
};

/** Candidates for a position, plus the current holder if they don't qualify. */
function candidatesFor(members: Member[], position: string) {
  return members.filter((m) => m.positions.includes(position));
}

function retainedFor(
  members: Member[],
  position: string,
  current?: { id: number; name?: string } | null,
) {
  if (!current) return null;
  const known = members.find((m) => m.id === current.id);
  if (known?.positions.includes(position)) return null;
  // An active member in the wrong position we can still name; an inactive one
  // is absent from the roster entirely.
  const name =
    current.name ??
    (known ? `${known.lastName}, ${known.firstName}` : 'Currently assigned');
  return { id: current.id, name };
}

type Slot = {
  position: Position;
  vacant: boolean;
  member?: { id: number; name: string };
  placeholder?: string;
};

type Day = {
  crewId: number;
  date: string;
  weekday: string;
  outOfService?: boolean;
  outOfServiceReason?: string | null;
  slots: Record<Position, Slot>;
};

type CrewsResponse = {
  weekStart: string;
  currentWeek: Day[];
  nextWeek: Day[];
};

type DefaultRow = {
  weekday: number;
  position: Position;
  memberId: number | null;
  placeholder: string | null;
};

/** Shift a YYYY-MM-DD date string by n days. */
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Today's YYYY-MM-DD in America/New_York. */
function todayNY(): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/New_York',
  }).format(new Date());
}

/** Whole days from `fromStr` to `toStr` (positive when toStr is later). */
function daysBetween(fromStr: string, toStr: string): number {
  const parse = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((parse(toStr) - parse(fromStr)) / 86_400_000);
}

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Schedule administration requires additional permissions. If you think
          you should have access, contact an officer.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function WeekTable({
  title,
  days,
  members,
}: {
  title: string;
  days: Day[];
  members: Member[];
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-medium tracking-tight">{title}</h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Night</TableHead>
              {POSITIONS.map((position) => (
                <TableHead key={position}>{COLUMN_LABELS[position]}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((day) => (
              <TableRow
                key={day.crewId}
                className={day.outOfService ? 'bg-muted/40' : undefined}
              >
                <TableCell className="align-top font-medium whitespace-nowrap">
                  {formatDay(day.date)}
                  <OutOfServiceToggle
                    date={day.date}
                    outOfService={!!day.outOfService}
                    reason={day.outOfServiceReason ?? null}
                  />
                </TableCell>
                {POSITIONS.map((position) => {
                  const slot = day.slots[position];
                  // Out of service keeps its duty supervisor and nothing else:
                  // somebody still carries the phone.
                  if (day.outOfService && position !== 'DUTY_SUP') {
                    return (
                      <TableCell
                        key={position}
                        className="align-top text-xs text-muted-foreground"
                      >
                        &mdash;
                      </TableCell>
                    );
                  }
                  return (
                    <TableCell key={position} className="align-top">
                      <SlotSelect
                        kind="slot"
                        target={day.crewId}
                        position={position}
                        label={`${formatDay(day.date)} — ${COLUMN_LABELS[position]}`}
                        members={candidatesFor(members, position)}
                        retained={retainedFor(members, position, slot?.member)}
                        memberId={slot?.member?.id}
                        placeholder={slot?.placeholder}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export default async function AdminSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; viewDate?: string }>;
}) {
  const { error, viewDate: rawViewDate } = await searchParams;
  const viewDate =
    rawViewDate && /^\d{4}-\d{2}-\d{2}$/.test(rawViewDate)
      ? rawViewDate
      : undefined;

  let crews: CrewsResponse;
  let members: Member[];
  let defaults: DefaultRow[];
  let settings: Record<string, unknown>;
  try {
    [crews, members, defaults, settings] = await Promise.all([
      api<CrewsResponse>(
        `/v1/crews${viewDate ? `?viewDate=${viewDate}` : ''}`,
      ),
      api<Member[]>('/v1/crews/assignable-members'),
      api<DefaultRow[]>('/v1/crews/defaults'),
      api<Record<string, unknown>>('/v1/crews/settings'),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  const defaultFor = (weekday: number, position: Position) =>
    defaults.find((d) => d.weekday === weekday && d.position === position);

  const weekStart = crews.weekStart;
  const notYetPublic = daysBetween(todayNY(), weekStart) >= 14;

  return (
    <TooltipProvider>
      <UndoProvider>
    <div className="space-y-8">
      <PageHeader
        title="Schedule Admin"
        description="Pick a member in any slot and it saves instantly."
      />
      <ErrorBanner message={error} />

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <UndoButton />
        <span aria-hidden className="h-4 w-px bg-border" />
        <Link
          href={`/admin/schedule?viewDate=${addDays(weekStart, -14)}`}
          className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          &larr; Previous week
        </Link>
        <Link
          href="/admin/schedule"
          className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          This week
        </Link>
        <Link
          href={`/admin/schedule?viewDate=${addDays(weekStart, 14)}`}
          className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Next week &rarr;
        </Link>
        <span className="text-muted-foreground">
          Week of {formatDay(weekStart)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
        <span className="text-muted-foreground">
          Whole week ({formatDay(weekStart)}):
        </span>
        <form action={bulkWeek.bind(null, weekStart, 'apply-defaults')}>
          <button
            type="submit"
            className="h-8 rounded-md border px-3 text-sm hover:bg-muted"
          >
            Fill vacancies from template
          </button>
        </form>
        {/* Two steps: clearing a week is not a one-click action. */}
        <details>
          <summary className="cursor-pointer text-muted-foreground">
            Clear week…
          </summary>
          <form
            action={bulkWeek.bind(null, weekStart, 'clear')}
            className="mt-2"
          >
            <button
              type="submit"
              className="h-8 rounded-md border border-destructive px-3 text-sm text-destructive hover:bg-destructive/10"
            >
              Empty every slot this week
            </button>
          </form>
        </details>
        <span className="text-xs text-muted-foreground">
          Filling never displaces anyone already scheduled. Nights that have
          already happened are left alone.
        </span>
      </div>

      {notYetPublic ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          These weeks are not yet public to members.
        </div>
      ) : null}

      <WeekTable
        title={`Week of ${formatDay(weekStart)}`}
        days={crews.currentWeek}
        members={members}
      />
      <WeekTable
        title={`Week of ${formatDay(addDays(weekStart, 7))}`}
        days={crews.nextWeek}
        members={members}
      />

      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-lg font-medium tracking-tight">
            Weekly defaults
          </h2>
          <Link
            href="/admin/availability"
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Availability polls
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Applied when new crew nights are generated.
        </p>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Weekday</TableHead>
                {POSITIONS.map((position) => (
                  <TableHead key={position}>
                    {COLUMN_LABELS[position]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {WEEKDAYS.map((weekdayName, weekday) => (
                <TableRow key={weekday}>
                  <TableCell className="align-top font-medium">
                    {weekdayName}
                  </TableCell>
                  {POSITIONS.map((position) => {
                    const row = defaultFor(weekday, position);
                    return (
                      <TableCell key={position} className="align-top">
                        <SlotSelect
                          kind="default"
                          target={weekday}
                          position={position}
                          label={`${weekdayName} default — ${COLUMN_LABELS[position]}`}
                          members={candidatesFor(members, position)}
                          retained={retainedFor(
                            members,
                            position,
                            row?.memberId ? { id: row.memberId } : null,
                          )}
                          memberId={row?.memberId ?? undefined}
                          placeholder={row?.placeholder ?? undefined}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium tracking-tight">Settings</h2>
        <Card>
          <CardContent className="pt-6">
            <dl className="grid gap-2 sm:grid-cols-2">
              {Object.entries(settings).map(([key, value]) => (
                <div key={key} className="text-sm">
                  <dt className="font-medium">{key}</dt>
                  <dd className="text-muted-foreground">
                    {typeof value === 'object' && value !== null
                      ? JSON.stringify(value)
                      : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </section>
    </div>
      </UndoProvider>
    </TooltipProvider>
  );
}
