import Link from 'next/link';
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
import { applySuspensions } from './actions';
import { WarnButton } from './warn-button';

type AtRisk = {
  memberId: number;
  memberName: string;
  credentials: string[];
  missing: string[];
};

type Change = {
  id: number;
  to: 'ACTIVE' | 'SUSPENDED';
  memberId: number;
  memberName: string;
  credential: string;
};

export const dynamic = 'force-dynamic';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Reviewing pending suspensions needs credentials:grant.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function SuspensionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    applied?: string;
    back?: string;
  }>;
}) {
  const { error, applied, back } = await searchParams;
  let atRisk: AtRisk[];
  let changes: Change[];
  try {
    [atRisk, changes] = await Promise.all([
      api<AtRisk[]>('/v1/certifications/suspensions/by-member'),
      api<Change[]>('/v1/certifications/suspensions/preview'),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  const reinstatements = changes.filter((change) => change.to === 'ACTIVE');
  const credentialCount = changes.filter(
    (change) => change.to === 'SUSPENDED',
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending credential changes"
        description="What tonight's check would do, and why. Nothing here has happened yet."
      />
      <ErrorBanner message={error} />
      {applied ? (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          Applied: {applied} suspended, {back} reinstated.
        </p>
      ) : null}

      {atRisk.length ? (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base">
              {atRisk.length} {atRisk.length === 1 ? 'person' : 'people'} at
              risk, {credentialCount}{' '}
              {credentialCount === 1 ? 'credential' : 'credentials'}
            </CardTitle>
            <CardDescription>
              Each of these is missing a current certification that a credential
              they hold depends on. Warning them first is usually the kinder
              order — they can upload the card and be off the list before
              anything is suspended. If a rule is wrong, fix the requirement
              instead; if one person should be excused, waive it on their
              record.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {atRisk.map((person) => (
              <div
                key={person.memberId}
                className="space-y-2 rounded-md border p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/members/${person.memberId}`}
                    className="text-sm font-medium underline underline-offset-2"
                  >
                    {person.memberName}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    needs {person.missing.join(', ')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {person.credentials.map((credential) => (
                    <Badge key={credential} variant="secondary">
                      {credential}
                    </Badge>
                  ))}
                </div>
                <WarnButton
                  memberId={person.memberId}
                  label={`Warn ${person.memberName.split(' ')[0]}`}
                />
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-4 border-t pt-4">
              <WarnButton memberId={null} label={`Warn all ${atRisk.length}`} />
              <form action={applySuspensions}>
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                >
                  Suspend now
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nothing would be suspended. The nightly check will run normally.
          </CardContent>
        </Card>
      )}

      {reinstatements.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {reinstatements.length} would be reinstated
            </CardTitle>
            <CardDescription>
              These meet their requirements again. Reinstatements are applied by
              the nightly check regardless — nobody is harmed by getting a
              credential back — so this is here for completeness.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {reinstatements.map((change) => (
              <Badge key={change.id} variant="secondary">
                {change.memberName} — {change.credential}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
