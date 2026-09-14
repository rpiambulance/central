import Link from 'next/link';
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
  addAction,
  addDesignator,
  addHospital,
  retireAction,
} from './actions';

type Config = {
  designators: Array<{ id: number; name: string }>;
  hospitals: Array<{ id: number; name: string }>;
  actions: Array<{ id: number; label: string; order: number }>;
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
        description="Unit designators, where patients can be taken, and the buttons an encounter offers."
      />
      <ErrorBanner message={error} />
      {done ? (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          Saved.
        </p>
      ) : null}

      <p className="text-sm text-muted-foreground">
        The places themselves — and the spots inside them — are edited on{' '}
        <Link href="/admin/locations" className="underline underline-offset-2">
          Places
        </Link>
        , because they serve events and run numbers as well as standbys.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Encounter buttons</CardTitle>
          <CardDescription>
            One press marks the time and who pressed it, on the encounter and
            on the timeline — dispatched, on scene, investigating, moving to
            FAR. Short words, in the order they usually happen, because the
            point of them is a thumb rather than a sentence. Retiring one
            leaves what was already pressed exactly as it read.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form action={addAction} className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Words on the button
              <input
                name="label"
                required
                maxLength={60}
                placeholder="On scene"
                className={`${FIELD} w-56`}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Order
              <input
                name="order"
                type="number"
                defaultValue={config.actions.length}
                className={`${FIELD} w-20`}
              />
            </label>
            <Button type="submit" size="sm">
              Add
            </Button>
          </form>
          <ul className="flex flex-wrap gap-2">
            {config.actions.map((action) => (
              <li
                key={action.id}
                className="flex items-center gap-1 rounded-md border px-2 py-0.5 text-sm"
              >
                {action.label}
                <form action={retireAction.bind(null, action.id)}>
                  <button
                    type="submit"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Retire ${action.label}`}
                  >
                    ×
                  </button>
                </form>
              </li>
            ))}
            {!config.actions.length ? (
              <li className="text-sm text-muted-foreground">
                No buttons yet, so an encounter offers only its note box.
              </li>
            ) : null}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
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
