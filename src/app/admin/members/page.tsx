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
import { requestProfileReviewFromAll } from './actions';
import { AddMemberForm } from './add-member-form';
import {
  MemberTable,
  type CredentialType,
  type MemberRow,
} from '@/components/member-table';

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
    asked?: string;
  }>;
}) {
  const { error, showInactive, deactivated, asked } = await searchParams;
  const permissions = await myPermissions();
  const maySeeInactive = permissions.has(VIEW_INACTIVE);
  const mayWrite = permissions.has('members:write');
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
      {asked ? (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          Asked {asked} active member{asked === '1' ? '' : 's'} to check their
          details. Inactive members were left alone.
        </p>
      ) : null}
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
        {mayWrite ? (
          <form
            action={requestProfileReviewFromAll}
            className="flex flex-wrap items-end gap-2"
          >
            <label className="grid gap-1 text-xs text-muted-foreground">
              Ask everyone to check their details — note (optional)
              <input
                name="note"
                placeholder="We're refreshing the call list before the semester."
                className="h-8 w-80 rounded-md border border-input bg-background px-2 text-sm"
              />
            </label>
            <Button type="submit" size="sm" variant="outline" className="h-8">
              Ask everyone
            </Button>
          </form>
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
          <AddMemberForm />
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
