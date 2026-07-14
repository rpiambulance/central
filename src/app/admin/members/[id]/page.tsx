import Link from 'next/link';
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
  appointDutySupervisor,
  grantCredential,
  revokeCredential,
  setMemberActive,
  updateMember,
} from './actions';

type MemberDetail = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  personalEmail: string | null;
  cellPhone: string | null;
  localAddress: string | null;
  homeAddress: string | null;
  dob: string | null;
  rcsId: string | null;
  rin: string | null;
  active: boolean;
  roles: Array<{
    id: number;
    startDate: string;
    endDate: string | null;
    role: { id: number; name: string };
  }>;
  credentials: Array<{
    id: number;
    status: string;
    title: string | null;
    grantedAt: string;
    type: { id: number; key: string; name: string };
  }>;
  certifications: Array<{
    id: number;
    status: string;
    identifier: string | null;
    expiresAt: string | null;
    type: { id: number; name: string };
  }>;
};

type CredentialType = { id: number; key: string; name: string };

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

function Dash() {
  return <span className="text-muted-foreground">&mdash;</span>;
}

function TextField({
  label,
  name,
  defaultValue,
  type = 'text',
  required = false,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      {label}
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className={`${inputCls} w-56`}
      />
    </label>
  );
}

export default async function AdminMemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const memberId = Number(id);

  let member: MemberDetail;
  let credentialTypes: CredentialType[];
  try {
    [member, credentialTypes] = await Promise.all([
      api<MemberDetail>(`/v1/members/${memberId}`),
      api<CredentialType[]>('/v1/credentials/types'),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  const activeCredentials = member.credentials.filter(
    (credential) => credential.status === 'ACTIVE',
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${member.firstName} ${member.lastName}`}
        description="Member profile, activation, and credentials."
      />
      <div>
        <Link
          href="/admin/members"
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          &larr; All members
        </Link>
      </div>
      <ErrorBanner message={error} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Status
            {member.active ? (
              <Badge>Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={setMemberActive.bind(null, memberId, !member.active)}>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              className={member.active ? 'text-destructive' : undefined}
            >
              {member.active ? 'Deactivate member' : 'Reactivate member'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact &amp; identity</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateMember.bind(null, memberId)} className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <TextField
                label="First name"
                name="firstName"
                defaultValue={member.firstName}
                required
              />
              <TextField
                label="Last name"
                name="lastName"
                defaultValue={member.lastName}
                required
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                defaultValue={member.email}
                required
              />
              <TextField
                label="Personal email"
                name="personalEmail"
                type="email"
                defaultValue={member.personalEmail ?? ''}
              />
              <TextField
                label="Cell phone"
                name="cellPhone"
                defaultValue={member.cellPhone ?? ''}
              />
              <TextField
                label="Local address"
                name="localAddress"
                defaultValue={member.localAddress ?? ''}
              />
              <TextField
                label="Home address"
                name="homeAddress"
                defaultValue={member.homeAddress ?? ''}
              />
              <TextField
                label="Date of birth"
                name="dob"
                type="date"
                defaultValue={member.dob ? member.dob.slice(0, 10) : ''}
              />
              <TextField
                label="RCS ID"
                name="rcsId"
                defaultValue={member.rcsId ?? ''}
              />
              <TextField
                label="RIN"
                name="rin"
                defaultValue={member.rin ?? ''}
              />
            </div>
            <Button type="submit" size="sm">
              Save profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {member.credentials.length ? (
            <ul className="space-y-1">
              {member.credentials.map((credential) => (
                <li
                  key={credential.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <span>{credential.title ?? credential.type.name}</span>
                  <Badge
                    variant={
                      credential.status === 'ACTIVE' ? 'default' : 'secondary'
                    }
                  >
                    {credential.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    granted {formatDate(credential.grantedAt)}
                  </span>
                  {credential.status === 'ACTIVE' ? (
                    <form
                      action={revokeCredential.bind(
                        null,
                        memberId,
                        credential.type.id,
                      )}
                    >
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-destructive"
                      >
                        revoke
                      </Button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No credentials.</p>
          )}

          <form
            action={grantCredential.bind(null, memberId)}
            className="flex flex-wrap items-end gap-2"
          >
            <label className="grid gap-1 text-xs text-muted-foreground">
              Credential type
              <select
                name="credentialTypeId"
                required
                defaultValue=""
                className={inputCls}
              >
                <option value="" disabled>
                  Select credential…
                </option>
                {credentialTypes
                  .filter(
                    (type) =>
                      !activeCredentials.some(
                        (credential) => credential.type.id === type.id,
                      ),
                  )
                  .map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
              </select>
            </label>
            <Button type="submit" size="sm" variant="outline">
              Grant
            </Button>
          </form>

          <form
            action={appointDutySupervisor.bind(null, memberId)}
            className="flex flex-wrap items-end gap-2 border-t pt-4"
          >
            <span className="text-sm font-medium">
              Appoint Duty Supervisor
            </span>
            <label className="flex items-center gap-2 pb-1 text-sm">
              <input type="checkbox" name="senior" />
              Senior Duty Supervisor
            </label>
            <Button type="submit" size="sm" variant="outline">
              Appoint
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
        </CardHeader>
        <CardContent>
          {member.roles.length ? (
            <ul className="space-y-1">
              {member.roles.map((assignment) => (
                <li
                  key={assignment.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <span>{assignment.role.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(assignment.startDate)}
                    {' – '}
                    {assignment.endDate
                      ? formatDate(assignment.endDate)
                      : 'present'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No roles.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Certifications</CardTitle>
        </CardHeader>
        <CardContent>
          {member.certifications.length ? (
            <ul className="space-y-1">
              {member.certifications.map((certification) => (
                <li
                  key={certification.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <span>{certification.type.name}</span>
                  <Badge variant="secondary">{certification.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {certification.expiresAt ? (
                      <>expires {formatDate(certification.expiresAt)}</>
                    ) : (
                      <Dash />
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No certifications.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
