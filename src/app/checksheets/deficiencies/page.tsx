import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { prefers12Hour } from '@/lib/me';
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
import { resolveDeficiency } from '../actions';

type Deficiency = {
  id: number;
  detail: string;
  expected: number | null;
  found: number | null;
  openedAt: string;
  lastSeenAt: string;
  asset: { id: number; name: string } | null;
  template: { id: number; name: string };
};

export const dynamic = 'force-dynamic';

export default async function DeficienciesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [rows, hour12] = await Promise.all([
    api<Deficiency[]>('/v1/checksheets/deficiencies'),
    prefers12Hour(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Open deficiencies"
        description="What is short or missing right now, from the checks that found it."
      />
      <ErrorBanner message={error} />

      {rows.length ? (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardHeader>
                <CardTitle className="text-base">{row.detail}</CardTitle>
                <CardDescription>
                  {row.asset ? `${row.asset.name} · ` : ''}
                  {row.template.name} · first found{' '}
                  {formatDateTime(row.openedAt, hour12)}
                  {row.lastSeenAt !== row.openedAt
                    ? `, last seen ${formatDateTime(row.lastSeenAt, hour12)}`
                    : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Resolving by hand is for the case where somebody restocks
                    without running the whole sheet again; a later check that
                    finds it in place closes it on its own. */}
                <form
                  action={resolveDeficiency.bind(null, row.id)}
                  className="flex flex-wrap items-end gap-2"
                >
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    What was done (optional)
                    <input
                      name="note"
                      placeholder="Restocked from the supply room"
                      className="h-8 w-80 rounded-md border border-input bg-background px-2 text-sm"
                    />
                  </label>
                  <Button type="submit" size="sm" variant="outline" className="h-8">
                    Mark resolved
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nothing outstanding.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
