import { api, ApiError } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
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
  createChore,
  deleteChore,
  postChoresNow,
  updateChore,
} from './actions';
import {
  ChoreForm,
  WEEKDAYS,
  type ChoreDefinition,
  type MemberOption,
} from './chore-form';

export const dynamic = 'force-dynamic';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Managing chores requires additional permissions.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

/** How often, in words, for the list. */
function cadenceLabel(chore: ChoreDefinition): string {
  if (chore.cadence === 'DAILY') return 'Every day';
  if (chore.cadence === 'WEEKLY') {
    return `Every ${WEEKDAYS[chore.dayOfWeek ?? 0]}`;
  }
  if (chore.cadence === 'MONTHLY') {
    return `On the ${chore.dayOfMonth ?? 1}${
      chore.dayOfMonth === 1 ? 'st' : chore.dayOfMonth === 2 ? 'nd' : chore.dayOfMonth === 3 ? 'rd' : 'th'
    }`;
  }
  return 'Once';
}

export default async function AdminChoresPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; posted?: string }>;
}) {
  const { error, posted } = await searchParams;

  let chores: ChoreDefinition[];
  let members: MemberOption[];
  try {
    [chores, members] = await Promise.all([
      api<ChoreDefinition[]>('/v1/chores/definitions'),
      api<MemberOption[]>('/v1/members'),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chores"
        description="What gets done, how often, and whose job it is."
      />
      <ErrorBanner message={error} />
      {posted ? (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          Tonight&apos;s list has been posted to Slack.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tonight&apos;s post</CardTitle>
          <CardDescription>
            The list goes to Slack at 18:00 on its own. This posts it now, or
            updates the post already there if one has gone out — it will not
            add a second.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={postChoresNow}>
            <Button type="submit" size="sm" variant="outline">
              Post tonight&apos;s chores
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-medium tracking-tight">
          Chores{' '}
          <span className="text-sm font-normal text-muted-foreground">
            ({chores.length})
          </span>
        </h2>
        {chores.length ? (
          chores.map((chore) => (
            <Card key={chore.id} className={chore.active ? undefined : 'opacity-70'}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{chore.name}</CardTitle>
                  <Badge variant="secondary">{cadenceLabel(chore)}</Badge>
                  {chore.assignee ? (
                    <Badge>
                      {chore.assignee.firstName} {chore.assignee.lastName}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Anyone</Badge>
                  )}
                  {chore.active ? null : (
                    <Badge variant="outline">Not in use</Badge>
                  )}
                </div>
                {chore.description ? (
                  <CardDescription>{chore.description}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3">
                <ChoreForm
                  action={updateChore.bind(null, chore.id)}
                  members={members}
                  chore={chore}
                  submitLabel="Save"
                />
                <details>
                  <summary className="cursor-pointer text-xs text-muted-foreground">
                    Delete this chore
                  </summary>
                  <form action={deleteChore.bind(null, chore.id)} className="mt-2">
                    <Button type="submit" size="sm" variant="destructive">
                      Delete {chore.name}
                    </Button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Takes its history with it. Turning it off instead keeps
                      the record of who did it.
                    </p>
                  </form>
                </details>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No chores yet. Add one below and it will start appearing on its
            own.
          </p>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New chore</CardTitle>
          <CardDescription>
            A chore with nobody named is open to whoever gets to it — that is
            how most of them work. Naming somebody makes it theirs every time
            it comes round, and a single night can still be handed over on the
            chores page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChoreForm
            action={createChore}
            members={members}
            submitLabel="Add chore"
          />
        </CardContent>
      </Card>
    </div>
  );
}
