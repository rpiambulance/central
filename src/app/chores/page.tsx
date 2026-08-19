import { api } from '@/lib/api';
import { formatDateTime, formatPlainDate } from '@/lib/format';
import { myPermissions, prefers12Hour } from '@/lib/me';
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
import { completeChore, reopenChore } from './actions';

type Occurrence = {
  id: number;
  dueOn: string;
  completedAt: string | null;
  note: string | null;
  postedAt: string | null;
  chore: {
    id: number;
    name: string;
    description: string | null;
    assignee: { id: number; firstName: string; lastName: string } | null;
  };
  completedBy: { id: number; firstName: string; lastName: string } | null;
};

export const dynamic = 'force-dynamic';

export default async function ChoresPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [occurrences, permissions, hour12] = await Promise.all([
    api<Occurrence[]>('/v1/chores'),
    myPermissions(),
    prefers12Hour(),
  ]);
  const canManage = permissions.has('chores:manage');

  const byDay = new Map<string, Occurrence[]>();
  for (const occurrence of occurrences) {
    const key = occurrence.dueOn.slice(0, 10);
    byDay.set(key, [...(byDay.get(key) ?? []), occurrence]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chores"
        description="What needs doing, and who has done it. The same list Slack posts each evening."
      />
      <ErrorBanner message={error} />

      {byDay.size === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nothing is due in the next fortnight.
          </CardContent>
        </Card>
      ) : (
        [...byDay].map(([date, list]) => {
          const outstanding = list.filter((o) => !o.completedAt).length;
          return (
            <Card key={date}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">
                    {formatPlainDate(date)}
                  </CardTitle>
                  {outstanding === 0 ? (
                    <Badge>All done</Badge>
                  ) : (
                    <Badge variant="secondary">
                      {outstanding} outstanding
                    </Badge>
                  )}
                </div>
                {list[0]?.postedAt ? (
                  <CardDescription>
                    Posted to Slack {formatDateTime(list[0].postedAt, hour12)}.
                  </CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-2">
                {list.map((occurrence) => (
                  <div
                    key={occurrence.id}
                    className={`flex flex-wrap items-start gap-3 rounded-md border p-3 ${
                      occurrence.completedAt
                        ? 'border-emerald-600/40 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : ''
                    }`}
                  >
                    <span aria-hidden className="pt-0.5 text-lg leading-none">
                      {occurrence.completedAt ? '☑' : '☐'}
                    </span>
                    <div className="min-w-48 flex-1">
                      <p
                        className={`text-sm font-medium ${
                          occurrence.completedAt ? 'line-through' : ''
                        }`}
                      >
                        {occurrence.chore.name}
                      </p>
                      {occurrence.chore.description ? (
                        <p className="text-xs text-muted-foreground">
                          {occurrence.chore.description}
                        </p>
                      ) : null}
                      {occurrence.chore.assignee ? (
                        <p className="text-xs text-muted-foreground">
                          Assigned to {occurrence.chore.assignee.firstName}{' '}
                          {occurrence.chore.assignee.lastName}
                        </p>
                      ) : null}
                      {occurrence.completedAt ? (
                        <p className="text-xs text-muted-foreground">
                          Done by{' '}
                          {occurrence.completedBy
                            ? `${occurrence.completedBy.firstName} ${occurrence.completedBy.lastName}`
                            : 'someone in Slack'}{' '}
                          · {formatDateTime(occurrence.completedAt, hour12)}
                          {occurrence.note ? ` — ${occurrence.note}` : ''}
                        </p>
                      ) : null}
                    </div>
                    {occurrence.completedAt ? (
                      canManage ? (
                        <form action={reopenChore.bind(null, occurrence.id)}>
                          <Button type="submit" size="sm" variant="ghost">
                            Reopen
                          </Button>
                        </form>
                      ) : null
                    ) : (
                      // Anyone may mark one done, exactly as anyone can press
                      // the button in Slack.
                      <form
                        action={completeChore.bind(null, occurrence.id)}
                        className="flex items-end gap-2"
                      >
                        <input
                          name="note"
                          placeholder="Note (optional)"
                          className="h-8 w-40 rounded-md border border-input bg-background px-2 text-sm"
                        />
                        <Button type="submit" size="sm">
                          Done
                        </Button>
                      </form>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
