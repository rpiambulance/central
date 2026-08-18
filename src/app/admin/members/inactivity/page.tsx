import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { formatPlainDate } from '@/lib/format';
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
import { deactivateSelected } from './actions';
import { CandidateTable, type Candidate } from './candidate-table';

// The review reflects live participation; never serve it from a cache.
export const dynamic = 'force-dynamic';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Deactivating members requires the
          <code className="mx-1">members:deactivate</code> permission.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

const inputCls =
  'h-8 rounded-md border border-input bg-background px-2 text-sm';

export default async function InactivityReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ since?: string; error?: string }>;
}) {
  const { since, error } = await searchParams;
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(since ?? '');

  let candidates: Candidate[] | null = null;
  if (valid) {
    try {
      candidates = await api<Candidate[]>(
        `/v1/members/inactivity-review?since=${since}`,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) return <NoAccess />;
      throw err;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deactivate inactive members"
        description="Find members with no night crew or event participation since a date, review the list, and deactivate the ones you choose."
      />
      <ErrorBanner message={error} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Choose a cutoff</CardTitle>
          <CardDescription>
            Anyone who has taken a crew shift or signed up for an event on or
            after this date is treated as active and will not be listed —
            including anyone already scheduled ahead.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              No participation since
              <input
                type="date"
                name="since"
                required
                defaultValue={since ?? ''}
                className={inputCls}
              />
            </label>
            <Button type="submit" size="sm" variant="outline" className="h-8">
              Review
            </Button>
          </form>
        </CardContent>
      </Card>

      {candidates === null ? null : candidates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Every active member has taken part since {formatPlainDate(since!)}.
            Nothing to do.
          </CardContent>
        </Card>
      ) : (
        <form action={deactivateSelected} className="space-y-4">
          <input type="hidden" name="since" value={since} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {candidates.length} member{candidates.length === 1 ? '' : 's'} with
                no participation since {formatPlainDate(since!)}
              </CardTitle>
              <CardDescription>
                Select all, or untick anyone who should stay active. Only
                ticked members are deactivated, and you are never included in
                your own review.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CandidateTable candidates={candidates} />
              <div className="flex items-center gap-3">
                <Button type="submit" variant="destructive" size="sm">
                  Deactivate selected
                </Button>
                <Link
                  href="/admin/members"
                  className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Cancel
                </Link>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
