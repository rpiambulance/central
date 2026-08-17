import { api } from '@/lib/api';
import { formatCredKey } from '@/lib/format';
import { summarizeCredentials } from '@/lib/credentials';
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
import { clearForCalls } from './actions';

type Member = {
  id: number;
  firstName: string;
  lastName: string;
  credentials: Array<{
    title: string | null;
    type: { key: string; name: string };
  }>;
};

// Reflects live credentials; never cache.
export const dynamic = 'force-dynamic';

export default async function ClearancesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cleared?: string }>;
}) {
  const { error, cleared } = await searchParams;
  const [grants, members] = await Promise.all([
    api<string[]>('/v1/credentials/trainer-grants'),
    api<Member[]>('/v1/members'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clear for calls"
        description="Trainers clear their own students for calls; no administrative permission is needed."
      />
      <ErrorBanner message={error} />
      {cleared ? (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          Cleared. If they had no 900 number, an officer has been asked to
          issue one.
        </p>
      ) : null}

      {grants.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              You aren&apos;t a trainer
            </CardTitle>
            <CardDescription>
              A crew chief trainer can clear members as A-CC, and a driver
              trainer as A-D. This page is empty until you hold one of those.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              You can clear members for{' '}
              {grants.map((key) => formatCredKey(key)).join(' and ')}
            </CardTitle>
            <CardDescription>
              Only members who do not already hold the credential are listed.
              Clearing takes effect immediately and tells the member.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Credentials</TableHead>
                    <TableHead>Clear for</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const held = new Set(
                      member.credentials.map((c) => c.type.key),
                    );
                    const available = grants.filter((key) => !held.has(key));
                    if (!available.length) return null;
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {member.lastName}, {member.firstName}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {summarizeCredentials(member.credentials).map(
                              (badge) => (
                                <Badge
                                  key={badge.key}
                                  variant="secondary"
                                  title={badge.tooltip}
                                >
                                  {badge.label}
                                </Badge>
                              ),
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {available.map((key) => (
                              <form
                                key={key}
                                action={clearForCalls.bind(
                                  null,
                                  member.id,
                                  key,
                                )}
                              >
                                <Button
                                  type="submit"
                                  size="sm"
                                  variant="outline"
                                >
                                  Clear as {formatCredKey(key)}
                                </Button>
                              </form>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
