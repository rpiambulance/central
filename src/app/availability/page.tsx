import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
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
import { savePollResponse } from './actions';

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

type Status = 'AVAILABLE' | 'UNAVAILABLE' | 'IF_NEEDED';

type OpenPoll = {
  id: number;
  name: string;
  createdAt: string;
  days: Record<string, Status>;
};

const CHOICES: { value: Status; label: string }[] = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'IF_NEEDED', label: 'If needed' },
  { value: 'UNAVAILABLE', label: 'Not available' },
];

function PollCard({ poll }: { poll: OpenPoll }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{poll.name}</CardTitle>
        <CardDescription>
          Opened {formatDate(poll.createdAt)}. Which nights of the week can you
          generally ride?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          key={JSON.stringify(poll.days)}
          action={savePollResponse.bind(null, poll.id)}
          className="space-y-3"
        >
          <div className="grid gap-2">
            {WEEKDAYS.map((weekdayName, weekday) => {
              const current = poll.days[String(weekday)];
              return (
                <div
                  key={weekday}
                  className="flex flex-wrap items-center gap-4 border-b pb-2 text-sm last:border-b-0"
                >
                  <span className="w-24 font-medium">{weekdayName}</span>
                  {CHOICES.map((choice) => (
                    <label
                      key={choice.value}
                      className="flex items-center gap-1.5 text-muted-foreground"
                    >
                      <input
                        type="radio"
                        name={`day-${weekday}`}
                        value={choice.value}
                        defaultChecked={current === choice.value}
                      />
                      {choice.label}
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Unanswered days are saved as not available.
          </p>
          <Button type="submit" variant="outline" size="sm">
            Save
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const polls = await api<OpenPoll[]>('/v1/availability/polls/mine/open');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Availability"
        description="Tell the scheduling team which weeknights work for you."
      />
      <ErrorBanner message={error} />
      {polls.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No open availability polls.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      )}
    </div>
  );
}
