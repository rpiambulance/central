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
import { ErrorBanner } from '@/components/error-banner';
import { PageHeader } from '@/components/page-header';
import { dropFromSlot, signupForSlot } from './actions';

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

  return (
    <span title={slot.reason} className="text-muted-foreground">
      &mdash;
      {slot.reason ? (
        <span className="block text-xs text-muted-foreground/70">
          {slot.reason}
        </span>
      ) : null}
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
  const data = await api<CrewsResponse>('/v1/crews');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Night Crews"
        description="Sign up for open crew slots for this week and next."
      />
      <ErrorBanner message={error} />
      <WeekTable title="This week" days={data.currentWeek} />
      <WeekTable title="Next week" days={data.nextWeek} />
    </div>
  );
}
