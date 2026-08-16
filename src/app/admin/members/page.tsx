import { summarizeCredentials } from '@/lib/credentials';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { myPermissions, VIEW_INACTIVE } from '@/lib/me';
import { InactiveToggle } from '@/components/inactive-toggle';
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
import { createMember } from './actions';

type MemberRow = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  cellPhone: string | null;
  active: boolean;
  credentials: Array<{
    title: string | null;
    type: { key: string; name: string };
  }>;
};

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
  try {
    members = await api<MemberRow[]>(
      `/v1/members${showingInactive ? '?includeInactive=true' : ''}`,
    );
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Credentials</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  <Link
                    href={`/admin/members/${member.id}`}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {member.lastName}, {member.firstName}
                  </Link>
                </TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  {member.active ? (
                    <Badge>Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {member.credentials.length ? (
                      summarizeCredentials(member.credentials).map((badge) => (
                        <Badge
                          key={badge.key}
                          variant="secondary"
                          title={badge.tooltip}
                        >
                          {badge.label}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        None
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
