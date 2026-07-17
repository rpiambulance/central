import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import {formatDate, formatCredKey } from '@/lib/format';
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
import {appointDutySupervisor,
  grantCredential,
  revokeCredential,
  setMemberActive,
  updateMember, waiveRequirement, addAdditionalRequirement, setAdjustmentSatisfied, removeAdjustment } from './actions';

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

type AdjCredentialType = { id: number; key: string; name: string; grantMethod?: string };

type ChecklistItem = {
  kind: string;
  label: string;
  satisfied: boolean;
  detail?: string;
  waived?: boolean;
  adjustmentId?: number;
  requirementId?: number;
};

type Adjustment = {
  id: number;
  kind: 'WAIVER' | 'ADDITIONAL';
  note: string | null;
  satisfiedAt: string | null;
  reqKind: string | null;
  createdBy: { firstName: string; lastName: string };
};

async function AdjustmentsCard({
  memberId,
  credentialTypes,
  adjustType,
}: {
  memberId: number;
  credentialTypes: AdjCredentialType[];
  adjustType?: string;
}) {
  const promotable = credentialTypes.filter(
    (t) => (t as { grantMethod?: string }).grantMethod !== 'APPOINTMENT',
  );
  const selected = promotable.find((t) => String(t.id) === adjustType);

  let checklist: ChecklistItem[] = [];
  let adjustments: Adjustment[] = [];
  let addFormData: {
    certTypes: Array<{ id: number; name: string }>;
    evalTemplates: Array<{ id: number; name: string }>;
    classes: Array<{ id: number; name: string }>;
  } | null = null;
  if (selected) {
    try {
      const [cl, adj, certTypes, evalTemplates, classes] = await Promise.all([
        api<ChecklistItem[]>(`/v1/credentials/checklist/${memberId}/${selected.id}`),
        api<Adjustment[]>(`/v1/promotions/adjustments/${memberId}/${selected.id}`),
        api<Array<{ id: number; name: string }>>('/v1/certifications/types'),
        api<Array<{ id: number; name: string }>>('/v1/evals/templates'),
        api<Array<{ id: number; name: string }>>('/v1/trainings/classes'),
      ]);
      checklist = cl;
      adjustments = adj;
      addFormData = { certTypes, evalTemplates, classes };
    } catch {
      // promotions:review required — hide detail
    }
  }

  const FIELD = 'h-8 rounded-md border border-input bg-background px-2 text-sm';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Promotion requirement adjustments
        </CardTitle>
        <CardDescription>
          Waive checklist requirements or add member-specific extras for a
          particular promotion. Changes apply to eligibility, My Training, and
          TC review immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-sm">
          {promotable.map((type) => (
            <a
              key={type.id}
              href={`?adjustType=${type.id}`}
              className={
                selected?.id === type.id
                  ? 'rounded-md bg-accent px-2 py-1 text-accent-foreground'
                  : 'rounded-md px-2 py-1 text-muted-foreground hover:text-foreground'
              }
            >
              {formatCredKey(type.key)}
            </a>
          ))}
        </div>

        {selected && addFormData ? (
          <>
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Checklist for {selected.name}</h3>
              <ul className="space-y-1 text-sm">
                {checklist.map((item, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2">
                    <span aria-hidden>{item.satisfied ? '✓' : '✗'}</span>
                    <span className={item.waived ? 'italic text-muted-foreground' : ''}>
                      {item.label}
                      {item.detail ? ` (${item.detail})` : ''}
                    </span>
                    {item.waived && item.adjustmentId ? (
                      <form action={removeAdjustment.bind(null, memberId, item.adjustmentId)}>
                        <Button type="submit" variant="ghost" size="sm" className="h-6 px-2 text-xs">
                          restore
                        </Button>
                      </form>
                    ) : item.requirementId ? (
                      <form
                        action={waiveRequirement.bind(null, memberId, selected.id, item.requirementId)}
                        className="flex items-center gap-1"
                      >
                        <input
                          name="note"
                          placeholder="reason"
                          className="h-6 w-32 rounded-md border border-input bg-background px-1 text-xs"
                        />
                        <Button type="submit" variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive">
                          waive
                        </Button>
                      </form>
                    ) : item.kind === 'CUSTOM' && item.adjustmentId ? (
                      <>
                        <form action={setAdjustmentSatisfied.bind(null, memberId, item.adjustmentId, !item.satisfied)}>
                          <Button type="submit" variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            {item.satisfied ? 'mark incomplete' : 'mark complete'}
                          </Button>
                        </form>
                        <form action={removeAdjustment.bind(null, memberId, item.adjustmentId)}>
                          <Button type="submit" variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive">
                            remove
                          </Button>
                        </form>
                      </>
                    ) : item.adjustmentId ? (
                      <form action={removeAdjustment.bind(null, memberId, item.adjustmentId)}>
                        <Button type="submit" variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive">
                          remove
                        </Button>
                      </form>
                    ) : null}
                  </li>
                ))}
                {!checklist.length ? (
                  <li className="text-muted-foreground">No requirements defined.</li>
                ) : null}
              </ul>
            </div>

            <form
              action={addAdditionalRequirement.bind(null, memberId, selected.id)}
              className="flex flex-wrap items-end gap-2 border-t pt-3"
            >
              <label className="grid gap-1 text-xs text-muted-foreground">
                Add requirement
                <select name="reqKind" defaultValue="CUSTOM" className={FIELD}>
                  <option value="CUSTOM">Free text (checked off manually)</option>
                  <option value="CERTIFICATION">Certification</option>
                  <option value="EVALUATION_COUNT">Signed evaluations</option>
                  <option value="CLASS">Class completion</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Certification
                <select name="certificationTypeId" defaultValue="" className={FIELD}>
                  <option value="">—</option>
                  {addFormData.certTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Eval template
                <select name="evalTemplateId" defaultValue="" className={FIELD}>
                  <option value="">—</option>
                  {addFormData.evalTemplates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Count
                <input name="count" type="number" min={1} className={`${FIELD} w-16`} />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Class
                <select name="classId" defaultValue="" className={FIELD}>
                  <option value="">—</option>
                  {addFormData.classes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Note / free-text requirement
                <input name="note" className={`${FIELD} w-64`} />
              </label>
              <Button type="submit" size="sm" variant="outline">
                Add
              </Button>
            </form>
            {adjustments.length ? (
              <p className="text-xs text-muted-foreground">
                {adjustments.length} adjustment(s) on file — set by{' '}
                {[...new Set(adjustments.map((a) => `${a.createdBy.firstName} ${a.createdBy.lastName}`))].join(', ')}.
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pick a credential above to view and adjust its checklist for this member.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function AdminMemberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; adjustType?: string }>;
}) {
  const [{ id }, { error, adjustType }] = await Promise.all([params, searchParams]);
  const memberId = Number(id);

  let member: MemberDetail;
  let credentialTypes: AdjCredentialType[];
  try {
    [member, credentialTypes] = await Promise.all([
      api<MemberDetail>(`/v1/members/${memberId}`),
      api<AdjCredentialType[]>('/v1/credentials/types'),
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
          <form
            key={JSON.stringify([member.firstName, member.lastName, member.email, member.dob, member.personalEmail, member.cellPhone, member.localAddress, member.homeAddress, member.rcsId, member.rin])}
            action={updateMember.bind(null, memberId)}
            className="space-y-4"
          >
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
      <AdjustmentsCard
        memberId={memberId}
        credentialTypes={credentialTypes}
        adjustType={adjustType}
      />
    </div>
  );
}
