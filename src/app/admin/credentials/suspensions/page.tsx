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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ErrorBanner } from '@/components/error-banner';
import { PageHeader } from '@/components/page-header';
import { applySuspensions } from './actions';

type Change = {
  id: number;
  to: 'ACTIVE' | 'SUSPENDED';
  memberId: number;
  memberName: string;
  credential: string;
  missing: string[];
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
  searchParams: Promise<{ error?: string; applied?: string; back?: string }>;
}) {
  const { error, applied, back } = await searchParams;
  let changes: Change[];
  try {
    changes = await api<Change[]>('/v1/certifications/suspensions/preview');
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  const suspensions = changes.filter((change) => change.to === 'SUSPENDED');
  const reinstatements = changes.filter((change) => change.to === 'ACTIVE');

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

      {suspensions.length ? (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base">
              {suspensions.length} would be suspended
            </CardTitle>
            <CardDescription>
              Each of these holds a credential with an ongoing certification
              requirement they do not currently meet. If that is right, apply
              it. If a rule is wrong, fix the requirement instead — and if one
              person should be excused, waive it on their record rather than
              relaxing it for everybody.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Credential</TableHead>
                    <TableHead>Missing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suspensions.map((change) => (
                    <TableRow key={change.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        <Link
                          href={`/admin/members/${change.memberId}`}
                          className="underline underline-offset-2"
                        >
                          {change.memberName}
                        </Link>
                      </TableCell>
                      <TableCell>{change.credential}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {change.missing.join(', ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <form action={applySuspensions}>
              <Button type="submit" variant="outline" className="text-destructive">
                Apply all {changes.length} changes
              </Button>
            </form>
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
              These meet their requirements again. Reinstatements are applied
              by the nightly check regardless — nobody is harmed by getting a
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
