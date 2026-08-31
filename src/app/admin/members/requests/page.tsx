import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
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
import { decideAccountRequest, decideProfileChange } from './actions';
import { displayName } from '@/lib/name';

type ProfileChange = {
  id: number;
  field: string;
  currentValue: string | null;
  requestedValue: string;
  reason: string | null;
  createdAt: string;
  member: { id: number; firstName: string; lastName: string };
};

type AccountRequest = {
  id: number;
  firstName: string;
  preferredFirstName?: string | null;
  lastName: string;
  email: string;
  personalEmail: string | null;
  cellPhone: string | null;
  homePhone: string | null;
  localAddress: string | null;
  homeAddress: string | null;
  dob: string | null;
  note: string | null;
  createdAt: string;
  invite: { code: string; label: string | null } | null;
};

const FIELD_LABEL: Record<string, string> = {
  firstName: 'first name',
  lastName: 'last name',
  email: 'portal email',
};

export const dynamic = 'force-dynamic';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>Reviewing requests needs members:write.</CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; decided?: string }>;
}) {
  const { error, decided } = await searchParams;
  let changes: ProfileChange[];
  let accounts: AccountRequest[];
  try {
    [changes, accounts] = await Promise.all([
      api<ProfileChange[]>('/v1/requests/profile/pending'),
      api<AccountRequest[]>('/v1/requests/account/pending'),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }
  const hour12 = await prefers12Hour();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requests"
        description="People asking for a detail to be changed, and people asking to be let in."
      />
      <ErrorBanner message={error} />
      {decided ? (
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          {decided === 'applied'
            ? 'Change applied, and the member has been told.'
            : decided === 'noted'
              ? 'Marked as accepted. Add them from the roster if you have not already.'
              : 'Declined, and the member has been told.'}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Detail changes ({changes.length})
          </CardTitle>
          <CardDescription>
            Names and portal emails are locked to members, so they ask here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {changes.map((change) => (
            <div key={change.id} className="space-y-2 rounded-md border p-3">
              <div className="text-sm">
                <Link
                  href={`/admin/members/${change.member.id}`}
                  className="font-medium underline underline-offset-2"
                >
                  {displayName(change.member)}
                </Link>{' '}
                asked to change their{' '}
                {FIELD_LABEL[change.field] ?? change.field} from{' '}
                <span className="font-mono">{change.currentValue ?? 'blank'}</span>{' '}
                to <span className="font-mono">{change.requestedValue}</span>
              </div>
              {change.reason ? (
                <p className="text-sm text-muted-foreground">
                  &ldquo;{change.reason}&rdquo;
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                asked {formatDateTime(change.createdAt, hour12)}
              </p>
              <form className="flex flex-wrap items-end gap-2">
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Note (optional)
                  <input
                    name="note"
                    className="h-8 w-64 rounded-md border border-input bg-background px-2 text-sm"
                  />
                </label>
                <Button
                  type="submit"
                  size="sm"
                  formAction={decideProfileChange.bind(null, change.id, true)}
                >
                  Apply it
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  formAction={decideProfileChange.bind(null, change.id, false)}
                >
                  Decline
                </Button>
              </form>
            </div>
          ))}
          {!changes.length ? (
            <p className="text-sm text-muted-foreground">Nothing waiting.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Account requests ({accounts.length})
          </CardTitle>
          <CardDescription>
            From the invite-code portal. Accepting one is a note that you have
            dealt with it — add them from the roster, which is what creates
            their login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {accounts.map((request) => (
            <div key={request.id} className="space-y-2 rounded-md border p-3">
              <div className="text-sm font-medium">
                {displayName(request)} — {request.email}
                {/* Both names matter here: the record is created under the
                    legal one, and they are greeted by the other. */}
                {request.preferredFirstName?.trim() &&
                request.preferredFirstName.trim() !== request.firstName ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    legally {request.firstName}
                  </span>
                ) : null}
              </div>
              {/* What they filled in, so the record can be created from this
                  page rather than from a follow-up email. Blank fields are
                  left out rather than shown empty — a list of dashes reads
                  as though something failed. */}
              <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                {(
                  [
                    ['Cell', request.cellPhone],
                    ['Home phone', request.homePhone],
                    ['Personal email', request.personalEmail],
                    ['Date of birth', request.dob ? formatDate(request.dob) : null],
                    ['Local address', request.localAddress],
                    ['Home address', request.homeAddress],
                  ] as const
                )
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label} className="flex gap-1">
                      <dt className="text-muted-foreground">{label}:</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
              </dl>
              <p className="text-xs text-muted-foreground">
                asked {formatDateTime(request.createdAt, hour12)}
                {request.invite
                  ? ` · via ${request.invite.label ?? request.invite.code}`
                  : ''}
              </p>
              {request.note ? (
                <p className="text-sm text-muted-foreground">
                  &ldquo;{request.note}&rdquo;
                </p>
              ) : null}
              <form className="flex flex-wrap items-end gap-2">
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Note (optional)
                  <input
                    name="note"
                    className="h-8 w-64 rounded-md border border-input bg-background px-2 text-sm"
                  />
                </label>
                <Button
                  type="submit"
                  size="sm"
                  formAction={decideAccountRequest.bind(null, request.id, true)}
                >
                  Accepted
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  formAction={decideAccountRequest.bind(null, request.id, false)}
                >
                  Decline
                </Button>
              </form>
            </div>
          ))}
          {!accounts.length ? (
            <p className="text-sm text-muted-foreground">Nothing waiting.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
