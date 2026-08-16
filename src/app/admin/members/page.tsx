import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { myPermissions, VIEW_INACTIVE } from '@/lib/me';
import { InactiveToggle } from '@/components/inactive-toggle';
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
import { createMember } from './actions';
import {
  MemberTable,
  type CredentialType,
  type MemberRow,
} from './member-table';

const inputCls =
  'h-8 rounded-md border border-input bg-background px-2 text-sm';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Member administration requires additional permissions. If you think
          you should have access, contact an officer.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    showInactive?: string;
    deactivated?: string;
  }>;
}) {
  const { error, showInactive, deactivated } = await searchParams;
  const permissions = await myPermissions();
  const maySeeInactive = permissions.has(VIEW_INACTIVE);
  const showingInactive = maySeeInactive && showInactive === '1';

  let members: MemberRow[];
  let credentialTypes: CredentialType[];
  try {
    [members, credentialTypes] = await Promise.all([
      api<MemberRow[]>(
        `/v1/members${showingInactive ? '?includeInactive=true' : ''}`,
      ),
      api<CredentialType[]>('/v1/credentials/types'),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="Roster administration: profiles, activation, and credentials."
      />
      <ErrorBanner message={error} />
      {deactivated ? (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          Deactivated {deactivated} member{deactivated === '1' ? '' : 's'}.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-4">
        {maySeeInactive ? (
          <InactiveToggle
            basePath="/admin/members"
            showingInactive={showingInactive}
          />
        ) : null}
        {maySeeInactive ? (
          <Link
            href="/admin/members/inactivity"
            className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Deactivate inactive members…
          </Link>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create member</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createMember} className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              First name
              <input
                type="text"
                name="firstName"
                required
                className={`${inputCls} w-36`}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Last name
              <input
                type="text"
                name="lastName"
                required
                className={`${inputCls} w-36`}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Email
              <input
                type="email"
                name="email"
                required
                className={`${inputCls} w-56`}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Date of birth (optional)
              <input type="date" name="dob" className={inputCls} />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              RCS ID (optional)
              <input type="text" name="rcsId" className={`${inputCls} w-28`} />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              RIN (optional)
              <input type="text" name="rin" className={`${inputCls} w-28`} />
            </label>
            <Button type="submit" size="sm">
              Create member
            </Button>
          </form>
        </CardContent>
      </Card>

      <MemberTable
        members={members}
        credentialTypes={credentialTypes}
        showingInactive={showingInactive}
      />
    </div>
  );
}
