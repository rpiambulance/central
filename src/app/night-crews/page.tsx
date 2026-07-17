import { api } from '@/lib/api';
import { formatDay } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ErrorBanner } from '@/components/error-banner';
import { PageHeader } from '@/components/page-header';
import {
  declareAbsence,
  dropFromSlot,
  removeAbsence,
  signupForSlot,
} from './actions';

const POSITIONS = ['CC', 'DRIVER', 'ATTENDANT', 'OBSERVER', 'DUTY_SUP'] as const;
type Position = (typeof POSITIONS)[number];

const COLUMN_LABELS: Record<Position, string> = {
  CC: 'Crew Chief',
  DRIVER: 'Driver',
  ATTENDANT: 'Rider',
  OBSERVER: 'Rider',
  DUTY_SUP: 'Duty Supervisor',
};

type Slot = {
  position: Position;
  vacant: boolean;
  member?: { id: number; name: string };
  placeholder?: string;
  eligible?: boolean;
  reason?: string;
  canDrop?: boolean;
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

type MyShift = {
  crewId: number;
  date: string;
  position: Position;
  isPublic: boolean;
};

type Absence = {
  id: number;
  date: string;
  note: string | null;
};

/** YYYY-MM-DD for tomorrow in America/New_York. */
function tomorrowNY(): string {
  const today = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/New_York',
  }).format(new Date());
  const [y, m, d] = today.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

function SlotCell({ crewId, slot }: { crewId: number; slot: Slot }) {
  if (slot.member) {
    return (
      <div className="flex items-center gap-2">
        <span>{slot.member.name}</span>
        {slot.canDrop ? (
          <form action={dropFromSlot.bind(null, crewId, slot.position)}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
            >
              drop
            </Button>
          </form>
        ) : null}
      </div>
    );
  }

  if (slot.placeholder) {
    return <span className="text-muted-foreground italic">{slot.placeholder}</span>;
  }

  if (slot.eligible) {
    return (
      <form action={signupForSlot.bind(null, crewId, slot.position)}>
        <Button type="submit" variant="outline" size="sm" className="h-7">
          Sign up
        </Button>
      </form>
    );
  }

  // Ineligible: just an em-dash; the reason lives in the hover tooltip.
  return (
    <span
      title={slot.reason || undefined}
      className="cursor-help text-muted-foreground"
    >
      &mdash;
    </span>
  );
}

function WeekTable({ title, days }: { title: string; days: Day[] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-medium tracking-tight">{title}</h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Night</TableHead>
              {POSITIONS.map((position) => (
                <TableHead key={position}>{COLUMN_LABELS[position]}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((day) => (
              <TableRow key={day.crewId}>
                <TableCell className="font-medium whitespace-nowrap">
                  {formatDay(day.date)}
                </TableCell>
                {POSITIONS.map((position) => (
                  <TableCell key={position} className="align-top">
                    <SlotCell crewId={day.crewId} slot={day.slots[position]} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export default async function NightCrewsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [data, myShifts, absences] = await Promise.all([
    api<CrewsResponse>('/v1/crews'),
    api<MyShift[]>('/v1/crews/mine'),
    api<Absence[]>('/v1/crews/absences/mine'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Night Crews"
        description="Sign up for open crew slots for this week and next."
      />
      <ErrorBanner message={error} />
      <WeekTable title="This week" days={data.currentWeek} />
      <WeekTable title="Next week" days={data.nextWeek} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My upcoming shifts</CardTitle>
            <CardDescription>
              All shifts you hold, including weeks not yet visible to members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming shifts.
              </p>
            ) : (
              <ul className="space-y-2">
                {myShifts.map((shift) => (
                  <li
                    key={`${shift.crewId}-${shift.position}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="font-medium whitespace-nowrap">
                      {formatDay(shift.date.slice(0, 10))}
                    </span>
                    <span className="text-muted-foreground">
                      {COLUMN_LABELS[shift.position]}
                    </span>
                    {!shift.isPublic ? (
                      <Badge
                        variant="secondary"
                        className="text-muted-foreground"
                      >
                        not yet public
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Planned absences</CardTitle>
            <CardDescription>
              Declaring an absence clears any shift you hold that day (normal
              drop deadline applies inside the visible window) and stops the
              default schedule from placing you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {absences.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No planned absences.
              </p>
            ) : (
              <ul className="space-y-2">
                {absences.map((absence) => (
                  <li
                    key={absence.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="font-medium whitespace-nowrap">
                      {formatDay(absence.date.slice(0, 10))}
                    </span>
                    {absence.note ? (
                      <span className="text-muted-foreground">
                        {absence.note}
                      </span>
                    ) : null}
                    <form
                      action={removeAbsence.bind(null, absence.id)}
                      className="ml-auto"
                    >
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground"
                      >
                        remove
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={declareAbsence} className="flex flex-wrap items-end gap-2">
              <div className="grid gap-1">
                <label
                  htmlFor="absence-date"
                  className="text-xs text-muted-foreground"
                >
                  Date
                </label>
                <input
                  id="absence-date"
                  type="date"
                  name="date"
                  required
                  min={tomorrowNY()}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                />
              </div>
              <div className="grid flex-1 gap-1">
                <label
                  htmlFor="absence-note"
                  className="text-xs text-muted-foreground"
                >
                  Note (optional)
                </label>
                <input
                  id="absence-note"
                  type="text"
                  name="note"
                  placeholder="e.g. out of town"
                  className="h-8 min-w-40 rounded-md border border-input bg-background px-2 text-sm"
                />
              </div>
              <Button type="submit" variant="outline" size="sm" className="h-8">
                Declare
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
