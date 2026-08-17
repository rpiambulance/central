import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCredKey } from '@/lib/format';
import { PositionField } from '../../position-field';
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
import { deleteEvent, updateEvent } from './actions';

const FIELD = 'h-9 rounded-md border border-input bg-background px-2 text-sm';

type EventDetail = {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
  kind: { id: number; name: string };
  tierId: number | null;
  attendeeCap: number | null;
  hidden: boolean;
  positions: Array<{
    position: string;
    count: number | null;
    requiredCredentialKey: string | null;
  }>;
};

/**
 * A datetime-local input wants the wall time where the event happens, not the
 * viewer's own clock — an officer editing from another timezone must not
 * silently shift the event.
 */
function localInputValue(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/New_York',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  // Intl reports midnight as hour 24 on some versions; normalize to 00.
  const hour = String(Number(get('hour')) % 24).padStart(2, '0');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const eventId = Number(id);
  const [{ error }, event, kinds, tiers, credentialTypes] = await Promise.all([
    searchParams,
    api<EventDetail>(`/v1/events/${eventId}`),
    api<Array<{ id: number; name: string }>>('/v1/events/kinds'),
    api<Array<{ id: number; name: string }>>('/v1/events/tiers'),
    api<Array<{ id: number; key: string; name: string }>>('/v1/credentials/types'),
  ]);

  // Five rows, prefilled with what the event already has.
  const rows = [0, 1, 2, 3, 4].map((i) => event.positions[i]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit event"
        description={event.title}
      />
      <ErrorBanner message={error} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event details</CardTitle>
          <CardDescription>
            Changes republish the event and update its Google Calendar entry.
            Clearing a position row removes that position.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={updateEvent.bind(null, eventId)}
            className="space-y-4"
            // Re-key on the server values so a save is reflected rather than
            // leaving stale text in the inputs.
            key={`${event.title}:${event.startsAt}:${event.positions.length}`}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Title
                <input
                  name="title"
                  required
                  defaultValue={event.title}
                  className={FIELD}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Location
                <input
                  name="location"
                  defaultValue={event.location ?? ''}
                  className={FIELD}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Starts
                <input
                  name="startsAt"
                  type="datetime-local"
                  required
                  defaultValue={localInputValue(event.startsAt)}
                  className={FIELD}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Ends
                <input
                  name="endsAt"
                  type="datetime-local"
                  required
                  defaultValue={localInputValue(event.endsAt)}
                  className={FIELD}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Kind
                <select
                  name="kindId"
                  required
                  defaultValue={String(event.kind.id)}
                  className={FIELD}
                >
                  {kinds.map((kind) => (
                    <option key={kind.id} value={kind.id}>
                      {kind.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Tier (optional)
                <select
                  name="tierId"
                  defaultValue={event.tierId ? String(event.tierId) : ''}
                  className={FIELD}
                >
                  <option value="">—</option>
                  {tiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Open-attendee cap (blank = unlimited, 0 = closed)
                <input
                  name="attendeeCap"
                  type="number"
                  min={0}
                  defaultValue={
                    event.attendeeCap === null
                      ? ''
                      : event.attendeeCap === -1
                        ? 0
                        : event.attendeeCap
                  }
                  className={FIELD}
                />
              </label>
              <label className="flex items-center gap-2 pt-4 text-sm">
                <input
                  type="checkbox"
                  name="hidden"
                  defaultChecked={event.hidden}
                />
                Hidden from members (draft)
              </label>
            </div>

            <label className="grid gap-1 text-xs text-muted-foreground">
              Description
              <textarea
                name="description"
                rows={3}
                defaultValue={event.description ?? ''}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
            </label>

            <fieldset className="space-y-2">
              <legend className="text-xs text-muted-foreground">
                Positional crew (clear a row to drop that position)
              </legend>
              {rows.map((row, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2">
                  <span className="grid gap-1 text-xs text-muted-foreground">
                    Position
                    <PositionField
                      index={i}
                      className={FIELD}
                      defaultValue={row?.position ?? ''}
                    />
                  </span>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Count (blank = no limit)
                    <input
                      name={`count-${i}`}
                      type="number"
                      min={1}
                      placeholder="any"
                      defaultValue={row?.count ?? ''}
                      className={`${FIELD} w-24`}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Required credential (or above)
                    <select
                      name={`credential-${i}`}
                      defaultValue={row?.requiredCredentialKey ?? ''}
                      className={FIELD}
                    >
                      <option value="">None</option>
                      {credentialTypes.map((type) => (
                        <option key={type.id} value={type.key}>
                          {formatCredKey(type.key)} — {type.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ))}
            </fieldset>

            <div className="flex items-center gap-3">
              <Button type="submit" size="sm">
                Save changes
              </Button>
              <Link
                href={`/events/${eventId}`}
                className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Delete this event</CardTitle>
          <CardDescription>
            Removes the event and everyone&apos;s signups. This cannot be
            undone — hide it instead if you only want it out of sight.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Two steps on purpose: the button is not reachable by one stray click. */}
          <details>
            <summary className="cursor-pointer text-sm text-muted-foreground">
              I want to delete this event
            </summary>
            <form action={deleteEvent.bind(null, eventId)} className="mt-3">
              <Button type="submit" size="sm" variant="destructive">
                Delete {event.title}
              </Button>
            </form>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
