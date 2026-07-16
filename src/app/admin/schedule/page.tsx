import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { formatDay } from '@/lib/format';
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
import { setDefaultSlot, setSlot } from './actions';

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

type Member = { id: number; firstName: string; lastName: string };

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

function SlotForm({
  members,
  action,
  currentMemberId,
  currentPlaceholder,
}: {
  members: Member[];
  action: (formData: FormData) => Promise<void>;
  currentMemberId?: number;
  currentPlaceholder?: string;
}) {
  return (
    <form action={action} className="grid w-40 gap-1">
      <select
        name="memberId"
        defaultValue={currentMemberId ?? ''}
        className="h-7 rounded-md border border-input bg-background px-1 text-xs"
      >
        <option value="">&mdash; vacant &mdash;</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.lastName}, {m.firstName}
          </option>
        ))}
      </select>
      <input
        type="text"
        name="placeholder"
        placeholder="or placeholder text"
        defaultValue={currentPlaceholder ?? ''}
        className="h-7 rounded-md border border-input bg-background px-1 text-xs"
      />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className="h-6 text-xs"
      >
        Set
      </Button>
    </form>
  );
}

function WeekTable({
  title,
  days,
  members,
  viewDate,
}: {
  title: string;
  days: Day[];
  members: Member[];
  viewDate?: string;
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
              <TableRow key={day.crewId}>
                <TableCell className="align-top font-medium whitespace-nowrap">
                  {formatDay(day.date)}
                </TableCell>
                {POSITIONS.map((position) => {
                  const slot = day.slots[position];
                  return (
                    <TableCell key={position} className="align-top">
                      <SlotForm
                        members={members}
                        action={setSlot.bind(null, day.crewId, position, viewDate)}
                        currentMemberId={slot?.member?.id}
                        currentPlaceholder={slot?.placeholder}
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
      api<Member[]>('/v1/members'),
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
    <div className="space-y-8">
      <PageHeader
        title="Schedule Admin"
        description="Override crew slots, manage weekly defaults, and review scheduling settings."
      />
      <ErrorBanner message={error} />

      <div className="flex flex-wrap items-center gap-4 text-sm">
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

      {notYetPublic ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          These weeks are not yet public to members.
        </div>
      ) : null}

      <WeekTable
        title={`Week of ${formatDay(weekStart)}`}
        days={crews.currentWeek}
        members={members}
        viewDate={viewDate}
      />
      <WeekTable
        title={`Week of ${formatDay(addDays(weekStart, 7))}`}
        days={crews.nextWeek}
        members={members}
        viewDate={viewDate}
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
                        <SlotForm
                          members={members}
                          action={setDefaultSlot.bind(
                            null,
                            weekday,
                            position,
                            viewDate,
                          )}
                          currentMemberId={row?.memberId ?? undefined}
                          currentPlaceholder={row?.placeholder ?? undefined}
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
  );
}
