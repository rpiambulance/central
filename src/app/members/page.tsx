import { api, ApiError } from '@/lib/api';
import { myPermissions, VIEW_INACTIVE } from '@/lib/me';
import { InactiveToggle } from '@/components/inactive-toggle';
import {
  MemberTable,
  type CredentialType,
  type MemberRow,
} from '@/components/member-table';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          The member roster requires additional permissions. If you think you
          should have access, contact an officer.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ showInactive?: string }>;
}) {
  const { showInactive } = await searchParams;
  const permissions = await myPermissions();
  const maySeeInactive = permissions.has(VIEW_INACTIVE);
  const showingInactive = maySeeInactive && showInactive === '1';
  // The record is only worth opening for somebody who can act on it: the page
  // is mostly forms, and offering it to a reader who cannot save is a dead end.
  const mayOpenRecords = permissions.has('members:write');

  let members: MemberRow[];
  let credentialTypes: CredentialType[];
  try {
    [members, credentialTypes] = await Promise.all([
      api<MemberRow[]>(
        `/v1/members${showingInactive ? '?includeInactive=true' : ''}`,
      ),
      api<CredentialType[]>('/v1/credentials/types'),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return <NoAccess />;
    throw error;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description={
          showingInactive
            ? `${members.length} members, including inactive.`
            : `${members.length} active members.`
        }
      />
      {maySeeInactive ? (
        <InactiveToggle basePath="/members" showingInactive={showingInactive} />
      ) : null}
      {/* The same table the console uses: searching, credential filtering and
          sorting are wanted here for the same reasons, and two copies would
          drift apart. */}
      <MemberTable
        members={members}
        credentialTypes={credentialTypes}
        showingInactive={showingInactive}
        linkProfiles={mayOpenRecords}
      />
    </div>
  );
}
