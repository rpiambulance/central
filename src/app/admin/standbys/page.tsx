import { api, ApiError } from '@/lib/api';
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
import {
  addDesignator,
  addHospital,
  addPlace,
  addSpot,
  retireLocation,
} from './actions';

type Config = {
  places: Array<{
    id: number;
    name: string;
    address: string | null;
    abbr: string | null;
    nextRun: number;
    parentId: number | null;
    spots: Array<{ id: number; name: string }>;
  }>;
  designators: Array<{ id: number; name: string }>;
  hospitals: Array<{ id: number; name: string }>;
};

const FIELD = 'h-8 rounded-md border border-input bg-background px-2 text-sm';

export const dynamic = 'force-dynamic';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>Standby setup requires settings:write.</CardDescription>
      </CardHeader>
    </Card>
  );
}

/**
 * The standing kit a standby is assembled from.
 *
 * Set up once and reused: the same gate is the same gate at every game, and
 * a supervisor should not be retyping a building's geography at kickoff.
 */
export default async function StandbySetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const { error, done } = await searchParams;
  let config: Config;
  try {
    config = await api<Config>('/v1/standbys/config/all');
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Standby setup"
        description="The places the agency goes and what the insides of them are called, unit designators, and where patients can be taken."
      />
      <ErrorBanner message={error} />
      {done ? (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          Saved.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Places</CardTitle>
          <CardDescription>
            One list, three jobs: where an event is, where a standby is
            worked, and where the run numbers count. A place with a letter is
            a counter — the letter is inside every number it issues, so the
            county reads it — and a place without one files its numbering
            under a place that has it. Name the spots inside a place — Gate
            1, North Stand, the aid room — and a supervisor can still invent
            one on the day.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={addPlace} className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Place
              <input name="name" required className={`${FIELD} w-56`} />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Address (optional)
              <input name="address" className={`${FIELD} w-56`} />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Letter (optional)
              <input
                name="abbr"
                maxLength={8}
                placeholder="T"
                className={`${FIELD} w-20 uppercase`}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Or files under
              <select name="parentId" defaultValue="" className={`${FIELD} w-48`}>
                <option value="">—</option>
                {config.places
                  .filter((counter) => counter.abbr)
                  .map((counter) => (
                    <option key={counter.id} value={counter.id}>
                      {counter.abbr} — {counter.name}
                    </option>
                  ))}
              </select>
            </label>
            <Button type="submit" size="sm">
              Add place
            </Button>
          </form>

          {config.places.map((place) => {
            const filesUnder = config.places.find(
              (counter) => counter.id === place.parentId,
            );
            return (
            <div key={place.id} className="rounded-md border p-3">
              <p className="font-medium">
                {place.name}
                {place.abbr ? (
                  <span className="ml-2 rounded-md border px-1.5 py-0.5 text-xs font-normal">
                    {place.abbr} · next {place.nextRun}
                  </span>
                ) : filesUnder ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    numbers count under {filesUnder.name}
                  </span>
                ) : (
                  <span className="ml-2 text-xs font-normal text-amber-700 dark:text-amber-500">
                    no run numbers here
                  </span>
                )}
              </p>
              {place.address ? (
                <p className="text-xs text-muted-foreground">{place.address}</p>
              ) : null}
              <ul className="mt-2 flex flex-wrap gap-2">
                {place.spots.map((location) => (
                  <li
                    key={location.id}
                    className="flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs"
                  >
                    {location.name}
                    <form action={retireLocation.bind(null, location.id)}>
                      <button
                        type="submit"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Retire ${location.name}`}
                      >
                        ×
                      </button>
                    </form>
                  </li>
                ))}
                {!place.spots.length ? (
                  <li className="text-xs text-muted-foreground">
                    Nothing inside it named yet.
                  </li>
                ) : null}
              </ul>
              <form
                action={addSpot.bind(null, place.id)}
                className="mt-2 flex flex-wrap items-end gap-2"
              >
                <input
                  name="name"
                  required
                  placeholder="Gate 1"
                  className={`${FIELD} w-56`}
                />
                <Button type="submit" size="sm" variant="outline">
                  Add spot
                </Button>
              </form>
            </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unit designators</CardTitle>
            <CardDescription>
              The usual ones, so they read the same from one event to the next.
              The designator is the name — M-1, Gator 1, Bike 1. Anything else
              can be invented at the event.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={addDesignator} className="flex flex-wrap items-end gap-2">
              <input
                name="name"
                required
                placeholder="M-1"
                className={`${FIELD} w-40`}
              />
              <Button type="submit" size="sm">
                Add
              </Button>
            </form>
            <ul className="flex flex-wrap gap-2">
              {config.designators.map((d) => (
                <li key={d.id} className="rounded-md border px-2 py-0.5 text-sm">
                  {d.name}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hospitals</CardTitle>
            <CardDescription>Where a transport can go.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={addHospital} className="flex flex-wrap items-end gap-2">
              <input name="name" required className={`${FIELD} w-64`} />
              <Button type="submit" size="sm">
                Add
              </Button>
            </form>
            <ul className="flex flex-wrap gap-2">
              {config.hospitals.map((h) => (
                <li key={h.id} className="rounded-md border px-2 py-0.5 text-sm">
                  {h.name}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
