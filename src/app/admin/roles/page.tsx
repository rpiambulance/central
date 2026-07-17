import { PERMISSION_INFO, groupPermissions } from '@/lib/permissions';
import { api, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
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
import {
  assignRole,
  createRole,
  deleteRole,
  removeAssignment,
  updateRole,
} from './actions';

type Role = {
  id: number;
  name: string;
  description: string | null;
  isOfficer: boolean;
  permissions: Array<{ permission: string }>;
  members: Array<{
    id: number;
    startDate: string;
    endDate: string | null;
    member: { id: number; firstName: string; lastName: string };
  }>;
};

type Member = { id: number; firstName: string; lastName: string };

function PermissionPicker({
  catalog,
  checked,
}: {
  catalog: string[];
  checked?: (permission: string) => boolean;
}) {
  return (
    <div className="space-y-3">
      {groupPermissions(catalog).map(({ group, permissions }) => (
        <div key={group}>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {group}
          </h4>
          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {permissions.map((permission) => (
              <label key={permission} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  name="permissions"
                  value={permission}
                  defaultChecked={checked?.(permission)}
                  className="mt-1"
                />
                <span>
                  <code className="text-xs">{permission}</code>
                  <span className="block text-xs text-muted-foreground">
                    {PERMISSION_INFO[permission] ?? ''}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Role administration requires additional permissions. If you think you
          should have access, contact an officer.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function MemberSelect({ members, name }: { members: Member[]; name: string }) {
  return (
    <select
      name={name}
      required
      defaultValue=""
      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
    >
      <option value="" disabled>
        Select member…
      </option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.lastName}, {m.firstName}
        </option>
      ))}
    </select>
  );
}

function RoleCard({
  role,
  members,
  permissionCatalog,
}: {
  role: Role;
  members: Member[];
  permissionCatalog: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {role.name}
          {role.isOfficer ? <Badge>Officer</Badge> : null}
        </CardTitle>
        {role.description ? (
          <CardDescription>{role.description}</CardDescription>
        ) : null}
        <div className="flex flex-wrap gap-1 pt-1">
          {role.permissions.length ? (
            [...role.permissions]
              .sort((a, b) => a.permission.localeCompare(b.permission))
              .map((p) => (
                <Badge
                  key={p.permission}
                  variant="secondary"
                  title={PERMISSION_INFO[p.permission]}
                >
                  {p.permission}
                </Badge>
              ))
          ) : (
            <span className="text-xs text-muted-foreground">
              No permissions
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Current assignments</h3>
          {role.members.length ? (
            <ul className="space-y-1">
              {role.members.map((assignment) => (
                <li
                  key={assignment.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <span>
                    {assignment.member.lastName}, {assignment.member.firstName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(assignment.startDate)}
                    {' – '}
                    {assignment.endDate
                      ? formatDate(assignment.endDate)
                      : 'present'}
                  </span>
                  <form action={removeAssignment.bind(null, assignment.id)}>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-destructive"
                    >
                      remove
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nobody assigned.</p>
          )}
        </div>
        <form
          action={assignRole.bind(null, role.id)}
          className="flex flex-wrap items-end gap-2"
        >
          <label className="grid gap-1 text-xs text-muted-foreground">
            Member
            <MemberSelect members={members} name="memberId" />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Start date
            <input
              type="date"
              name="startDate"
              required
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            End date (optional)
            <input
              type="date"
              name="endDate"
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            />
          </label>
          <Button type="submit" size="sm" variant="outline">
            Assign
          </Button>
        </form>

        <details className="rounded-md border px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">
            Edit permissions
          </summary>
          <form
            key={JSON.stringify([role.name, role.isOfficer, role.permissions.map((p) => p.permission).sort()])}
            action={updateRole.bind(null, role.id)}
            className="space-y-3 pt-3"
          >
            <input type="hidden" name="name" value={role.name} />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isOfficer"
                defaultChecked={role.isOfficer}
              />
              Officer role
            </label>
            <PermissionPicker
              catalog={permissionCatalog}
              checked={(permission) =>
                role.permissions.some((p) => p.permission === permission)
              }
            />
            <Button type="submit" size="sm" variant="outline">
              Save permissions
            </Button>
          </form>
        </details>

        <form
          action={deleteRole.bind(null, role.id)}
          className="flex items-center gap-3 border-t pt-3"
        >
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" required />
            I&apos;m sure
          </label>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="text-destructive"
          >
            Delete role
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  let roles: Role[];
  let permissionCatalog: string[];
  let members: Member[];
  try {
    [roles, permissionCatalog, members] = await Promise.all([
      api<Role[]>('/v1/roles'),
      api<string[]>('/v1/roles/permissions'),
      api<Member[]>('/v1/members'),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="Manage roles, their permissions, and member assignments."
      />
      <ErrorBanner message={error} />

      <Card>
        <CardHeader>
          <CardTitle>Create role</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createRole} className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Name
                <input
                  type="text"
                  name="name"
                  required
                  className="h-8 w-56 rounded-md border border-input bg-background px-2 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 pb-1 text-sm">
                <input type="checkbox" name="isOfficer" />
                Officer role
              </label>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-xs text-muted-foreground">
                Permissions
              </legend>
              <PermissionPicker catalog={permissionCatalog} />
            </fieldset>
            <Button type="submit" size="sm">
              Create role
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            role={role}
            members={members}
            permissionCatalog={permissionCatalog}
          />
        ))}
      </div>
    </div>
  );
}
