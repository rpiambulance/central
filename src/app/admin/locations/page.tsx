import { api, ApiError } from '@/lib/api';
import { myPermissions } from '@/lib/me';
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
import { addSpot, createPlace, retireSpot, updatePlace } from './actions';

type Place = {
  id: number;
  name: string;
  address: string | null;
  notes: string | null;
  active: boolean;
  abbr: string | null;
  nextRun: number;
  parentId: number | null;
  parent: { id: number; name: string; abbr: string | null } | null;
  spots: Array<{ id: number; name: string; active: boolean }>;
  _count: { runNumbers: number; standbys: number };
};

const FIELD = 'h-8 rounded-md border border-input bg-background px-2 text-sm';
const LABEL = 'grid gap-1 text-xs text-muted-foreground';

export const dynamic = 'force-dynamic';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>Editing places requires settings:write.</CardDescription>
      </CardHeader>
    </Card>
  );
}

/** The places that could be a counter, for the "files under" picker. */
function counterOptions(places: Place[], exclude?: number) {
  return places.filter((place) => place.abbr && place.id !== exclude);
}

/**
 * Every place the agency goes, in one list.
 *
 * It used to be three: venues for standbys, locations for run numbers, and
 * whatever somebody typed on an event. They were the same places, so this is
 * the one page that makes them — name, address, the letter its run numbers
 * carry, and the spots inside it.
 *
 * The letter and the counter sit behind run-numbers:manage even here, because
 * they are what a number filed with the county is made of. Everything else is
 * settings:write.
 */
export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const { error, done } = await searchParams;
  const permissions = await myPermissions();
  const mayCount = permissions.has('run-numbers:manage');

  let places: Place[];
  try {
    places = await api<Place[]>('/v1/places?all=1');
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }
  if (!permissions.has('settings:write')) return <NoAccess />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Places"
        description="Where events are, where standbys are worked, and where the run numbers count — one list, because they are the same places."
      />
      <ErrorBanner message={error} />
      {done ? (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          Saved.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a place</CardTitle>
          <CardDescription>
            A place with a letter is where numbering counts — the letter is
            inside every number issued there, so the county reads it. A place
            without one files its numbering under a place that has it. Give it
            one or the other, or neither if nothing is ever issued there.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={createPlace.bind(null, mayCount)}
            className="flex flex-wrap items-end gap-2"
          >
            <label className={LABEL}>
              Name
              <input name="name" required className={`${FIELD} w-56`} />
            </label>
            <label className={LABEL}>
              Address
              <input name="address" className={`${FIELD} w-56`} />
            </label>
            {mayCount ? (
              <label className={LABEL}>
                Letter
                <input
                  name="abbr"
                  maxLength={8}
                  placeholder="T"
                  className={`${FIELD} w-20 uppercase`}
                />
              </label>
            ) : null}
            <label className={LABEL}>
              Files under
              <select name="parentId" defaultValue="" className={`${FIELD} w-48`}>
                <option value="">—</option>
                {counterOptions(places).map((counter) => (
                  <option key={counter.id} value={counter.id}>
                    {counter.abbr} — {counter.name}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" size="sm">
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {places.map((place) => (
        <Card key={place.id} className={place.active ? '' : 'opacity-60'}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-baseline gap-2 text-base">
              {place.name}
              {place.abbr ? (
                <span className="rounded-md border px-1.5 py-0.5 text-xs font-normal">
                  {place.abbr} · next {place.nextRun}
                </span>
              ) : place.parent ? (
                <span className="text-xs font-normal text-muted-foreground">
                  numbers count under {place.parent.name}
                </span>
              ) : (
                <span className="text-xs font-normal text-amber-700 dark:text-amber-500">
                  no run numbers here
                </span>
              )}
              {place.active ? null : (
                <span className="text-xs font-normal text-muted-foreground">
                  retired
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {place._count.standbys} standby
              {place._count.standbys === 1 ? '' : 's'} ·{' '}
              {place._count.runNumbers} run number
              {place._count.runNumbers === 1 ? '' : 's'} issued
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              action={updatePlace.bind(null, place.id, mayCount)}
              className="flex flex-wrap items-end gap-2"
            >
              <label className={LABEL}>
                Name
                <input
                  name="name"
                  defaultValue={place.name}
                  required
                  className={`${FIELD} w-56`}
                />
              </label>
              <label className={LABEL}>
                Address
                <input
                  name="address"
                  defaultValue={place.address ?? ''}
                  className={`${FIELD} w-56`}
                />
              </label>
              {mayCount ? (
                <>
                  <label className={LABEL}>
                    Letter
                    <input
                      name="abbr"
                      defaultValue={place.abbr ?? ''}
                      maxLength={8}
                      className={`${FIELD} w-20 uppercase`}
                    />
                  </label>
                  <label className={LABEL}>
                    Next run
                    <input
                      name="nextRun"
                      type="number"
                      min={1}
                      defaultValue={place.nextRun}
                      className={`${FIELD} w-24`}
                    />
                  </label>
                </>
              ) : null}
              <label className={LABEL}>
                Files under
                <select
                  name="parentId"
                  defaultValue={place.parentId ?? ''}
                  className={`${FIELD} w-48`}
                >
                  <option value="">—</option>
                  {counterOptions(places, place.id).map((counter) => (
                    <option key={counter.id} value={counter.id}>
                      {counter.abbr} — {counter.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 pb-1 text-sm">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={place.active}
                />
                In use
              </label>
              <Button type="submit" size="sm" variant="outline">
                Save
              </Button>
            </form>

            <div>
              <p className="text-xs text-muted-foreground">
                Spots inside it — what a unit or an encounter can be at.
              </p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {place.spots
                  .filter((spot) => spot.active)
                  .map((spot) => (
                    <li
                      key={spot.id}
                      className="flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs"
                    >
                      {spot.name}
                      <form action={retireSpot.bind(null, spot.id)}>
                        <button
                          type="submit"
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Retire ${spot.name}`}
                        >
                          ×
                        </button>
                      </form>
                    </li>
                  ))}
                {!place.spots.some((spot) => spot.active) ? (
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
          </CardContent>
        </Card>
      ))}

      {!mayCount ? (
        <p className="text-xs text-muted-foreground">
          Run-number letters and counters are only editable with
          run-numbers:manage, because they are what a number filed with the
          county is made of.
        </p>
      ) : null}
    </div>
  );
}
