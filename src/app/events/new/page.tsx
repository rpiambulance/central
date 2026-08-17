import { api } from '@/lib/api';
import { PositionField } from '../position-field';
import { formatCredKey } from '@/lib/format';
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
import { createEvent } from './actions';

const FIELD = 'h-9 rounded-md border border-input bg-background px-2 text-sm';

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, kinds, tiers, credentialTypes] = await Promise.all([
    searchParams,
    api<Array<{ id: number; name: string }>>('/v1/events/kinds'),
    api<Array<{ id: number; name: string }>>('/v1/events/tiers'),
    api<Array<{ id: number; key: string; name: string }>>('/v1/credentials/types'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Event"
        description="Create an internal event directly — games, details, meetings, socials. Coverage requests from outside groups have their own workflow."
      />
      <ErrorBanner message={error} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event details</CardTitle>
          <CardDescription>
            The event publishes immediately (and syncs to Google Calendar)
            unless you mark it hidden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createEvent} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Title
                <input name="title" required className={FIELD} />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Location
                <input name="location" className={FIELD} />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Starts
                <input name="startsAt" type="datetime-local" required className={FIELD} />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Ends
                <input name="endsAt" type="datetime-local" required className={FIELD} />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Kind
                <select name="kindId" required defaultValue="" className={FIELD}>
                  <option value="" disabled>
                    Select…
                  </option>
                  {kinds.map((kind) => (
                    <option key={kind.id} value={kind.id}>
                      {kind.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Tier (optional)
                <select name="tierId" defaultValue="" className={FIELD}>
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
                <input name="attendeeCap" type="number" min={0} className={FIELD} />
              </label>
              <label className="flex items-center gap-2 pt-4 text-sm">
                <input type="checkbox" name="hidden" />
                Hidden from members (draft)
              </label>
            </div>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Description
              <textarea
                name="description"
                rows={3}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              />
            </label>

            <fieldset className="space-y-2">
              <legend className="text-xs text-muted-foreground">
                Positional crew (optional — leave rows blank to skip)
              </legend>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-wrap items-end gap-2">
                  <span className="grid gap-1 text-xs text-muted-foreground">
                    Position
                    <PositionField index={i} className={FIELD} />
                  </span>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Count (blank = no limit)
                    <input
                      name={`count-${i}`}
                      type="number"
                      min={1}
                      placeholder="any"
                      className={`${FIELD} w-24`}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    Required credential (or above)
                    <select name={`credential-${i}`} defaultValue="" className={FIELD}>
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

            <Button type="submit">Create event</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
