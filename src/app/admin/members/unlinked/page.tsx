import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
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
import { linkLogin } from './actions';

type Unlinked = {
  id: number;
  keycloakSubject: string;
  email: string | null;
  name: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  attempts: number;
};

type Member = { id: number; firstName: string; lastName: string; email: string };

export const dynamic = 'force-dynamic';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>Linking logins needs members:write.</CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function UnlinkedLoginsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; linked?: string }>;
}) {
  const { error, linked } = await searchParams;
  let logins: Unlinked[];
  let members: Member[];
  try {
    [logins, members] = await Promise.all([
      api<Unlinked[]>('/v1/members/unlinked-logins'),
      api<Member[]>('/v1/members'),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }
  const hour12 = await prefers12Hour();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logins waiting to be linked"
        description="People who can sign in but match nobody on the roster. Until this is done they see nothing."
      />
      <ErrorBanner message={error} />
      {linked ? (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          Linked. They will see the portal on their next page load.
        </p>
      ) : null}

      {logins.length ? (
        <div className="space-y-3">
          {logins.map((login) => (
            <Card key={login.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {login.name ?? login.email ?? 'Unknown'}
                </CardTitle>
                <CardDescription>
                  {login.email ?? 'no address on the login'} · first tried{' '}
                  {formatDateTime(login.firstSeenAt, hour12)} · {login.attempts}{' '}
                  {login.attempts === 1 ? 'attempt' : 'attempts'}, last{' '}
                  {formatDateTime(login.lastSeenAt, hour12)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <form
                  action={linkLogin.bind(null, login.id)}
                  className="flex flex-wrap items-end gap-2"
                >
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    This is
                    <select
                      name="memberId"
                      defaultValue=""
                      required
                      className="h-8 w-72 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="" disabled>
                        Choose a member…
                      </option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.lastName}, {member.firstName} — {member.email}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button type="submit" size="sm">
                    Link this login
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground">
                  If they are not on the roster at all,{' '}
                  <Link href="/admin/members" className="underline underline-offset-2">
                    add them
                  </Link>{' '}
                  with this address and their login links itself.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nobody is waiting.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
