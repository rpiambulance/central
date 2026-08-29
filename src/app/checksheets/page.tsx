import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
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

type Due = {
  template: { id: number; name: string; cadence: string };
  asset: { id: number; name: string } | null;
  lastCompletedAt: string | null;
  dueInDays: number | null;
  overdue: boolean;
  neverCompleted: boolean;
};

type Template = {
  id: number;
  name: string;
  description: string | null;
  cadence: string;
  assetKind: { id: number; name: string } | null;
};

export const dynamic = 'force-dynamic';

/** "Overdue", "due today", "in 3 days" — the same fact, said plainly. */
function dueLabel(row: Due): string {
  if (row.neverCompleted) return 'never checked';
  if (row.dueInDays === null) return 'no schedule';
  if (row.dueInDays < 0) return `${Math.abs(row.dueInDays)} days overdue`;
  if (row.dueInDays === 0) return 'due today';
  return `due in ${row.dueInDays} day${row.dueInDays === 1 ? '' : 's'}`;
}

export default async function ChecksheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string; short?: string }>;
}) {
  const { error, done, short } = await searchParams;
  const [templates, due, permissions, hour12] = await Promise.all([
    api<Template[]>('/v1/checksheets'),
    api<Due[]>('/v1/checksheets/due'),
    myPermissions(),
    prefers12Hour(),
  ]);
  const mayReadAll = permissions.has('checksheets:read-all');
  const outstanding = due.filter((row) => row.overdue);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checksheets"
        description="Truck, bag and equipment checks. Anyone can complete one."
      />
      <ErrorBanner message={error} />
      {done ? (
        <p
          className={
            Number(short)
              ? 'rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200'
              : 'rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
          }
        >
          Check recorded.{' '}
          {Number(short)
            ? `${short} item${short === '1' ? ' is' : 's are'} short or missing — ${
                mayReadAll ? 'they are on the deficiencies list.' : 'an officer has been told.'
              }`
            : 'Everything was present.'}
        </p>
      ) : null}

      {mayReadAll ? (
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/checksheets/deficiencies" className="underline underline-offset-2">
            Open deficiencies
          </Link>
          <Link href="/checksheets/expiring" className="underline underline-offset-2">
            Expiring soon
          </Link>
          <Link href="/checksheets/runs" className="underline underline-offset-2">
            Completed sheets
          </Link>
        </div>
      ) : null}

      {outstanding.length ? (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base">Due now</CardTitle>
            <CardDescription>
              Checks past their schedule, or never done at all.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {outstanding.map((row) => (
              <div
                key={`${row.template.id}:${row.asset?.id ?? 0}`}
                className="flex flex-wrap items-center gap-3 rounded-md border p-2"
              >
                <span className="text-sm font-medium">
                  {row.template.name}
                  {row.asset ? ` — ${row.asset.name}` : ''}
                </span>
                <Badge variant="secondary">{dueLabel(row)}</Badge>
                <Button
                  render={
                    <Link
                      href={`/checksheets/${row.template.id}${row.asset ? `?assetId=${row.asset.id}` : ''}`}
                    />
                  }
                  size="sm"
                  className="ml-auto h-8"
                >
                  Do it
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((template) => {
          const rows = due.filter((row) => row.template.id === template.id);
          const last = rows
            .map((row) => row.lastCompletedAt)
            .filter(Boolean)
            .sort()
            .at(-1);
          return (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle className="text-base">{template.name}</CardTitle>
                <CardDescription>
                  {template.description ??
                    (template.assetKind
                      ? `For each ${template.assetKind.name.toLowerCase()}.`
                      : 'A standalone check.')}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Button
                  render={<Link href={`/checksheets/${template.id}`} />}
                  size="sm"
                  variant="outline"
                >
                  Complete this
                </Button>
                <span className="text-xs text-muted-foreground">
                  {last
                    ? `last done ${formatDateTime(last, hour12)}`
                    : 'never completed'}
                </span>
              </CardContent>
            </Card>
          );
        })}
        {!templates.length ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No checksheets have been set up yet.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
