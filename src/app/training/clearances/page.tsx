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

type Candidates = {
  key: string;
  name: string;
  members: Member[];
};

// Reflects live credentials; never cache.
export const dynamic = 'force-dynamic';

export default async function ClearancesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cleared?: string }>;
}) {
  const { error, cleared } = await searchParams;
  const tracks = await api<Candidates[]>('/v1/credentials/trainer-candidates');

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

      {tracks.length === 0 ? (
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
        tracks.map((track) => (
          <Card key={track.key}>
            <CardHeader>
              <CardTitle className="text-base">
                Ready to clear as {formatCredKey(track.key)}
              </CardTitle>
              <CardDescription>
                {track.name}. Everyone here has finished what it asks for and
                is not already at that level or above. Clearing takes effect
                immediately and tells the member.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {track.members.length ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Credentials</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {track.members.map((member) => (
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
                          <TableCell className="text-right">
                            <form
                              action={clearForCalls.bind(
                                null,
                                member.id,
                                track.key,
                              )}
                            >
                              <Button type="submit" size="sm" variant="outline">
                                Clear as {formatCredKey(track.key)}
                              </Button>
                            </form>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                // Empty means "nobody is ready", not "something is broken",
                // so it says which of the two it is.
                <p className="text-sm text-muted-foreground">
                  Nobody is ready for {formatCredKey(track.key)} right now.
                  Members appear here once they hold what it requires and have
                  finished its checklist.
                </p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
