import { formatCredKey } from '@/lib/format';
import { api, ApiError } from '@/lib/api';
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
import {
  setCredentialRoles,
  addRequirement,
  createCertificationType,
  createEventKind,
  deactivateCertificationType,
  deactivateEventKind,
  removeRequirement,
  updateDayOfUnlockTime,
  updateDropDeadline,
  updateMinAgeYears,
  updateProbationaryRequiresTrainer,
  updateRiderSignupOpen,
  updateRotationWeeks,
} from './actions';

type SchedulingKnobs = {
  minAgeYears: number;
  riderSignupOpen: { weekday: number; time: string };
  rotationWeeks: number;
  dayOfUnlockTime: string;
  probationaryRequiresTrainer: boolean;
  dropDeadline: { daysBefore: number; time: string };
};

type CertType = {
  id: number;
  name: string;
  abbreviation: string;
  issuingOrg: string | null;
  defaultValidityMonths: number | null;
  active?: boolean;
};

type EventKind = { id: number; name: string; active?: boolean };

type Requirement = {
  id: number;
  kind: 'CERTIFICATION' | 'EVALUATION_COUNT' | 'CLASS';
  count: number | null;
  certificationType: { id: number; name: string } | null;
  evalTemplate: { id: number; name: string } | null;
  class: { id: number; name: string } | null;
};

type CredentialType = {
  id: number;
  key: string;
  name: string;
  requirements: Requirement[];
  linkedRoles: Array<{ role: { id: number; name: string } }>;
};

type RoleOption = { id: number; name: string };

type EvalTemplate = { id: number; name: string; version: number };

type TrainingClass = { id: number; name: string };

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const inputCls =
  'h-8 rounded-md border border-input bg-background px-2 text-sm';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Settings administration requires additional permissions. If you think
          you should have access, contact an officer.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function Dash() {
  return <span className="text-muted-foreground">&mdash;</span>;
}

function requirementLabel(req: Requirement): string {
  if (req.kind === 'CERTIFICATION') {
    return `Certification: ${req.certificationType?.name ?? 'unknown'}`;
  }
  if (req.kind === 'EVALUATION_COUNT') {
    return `${req.count ?? 1} × evaluation: ${req.evalTemplate?.name ?? 'unknown'}`;
  }
  return `Class: ${req.class?.name ?? 'unknown'}`;
}

function SchedulingCard({ knobs }: { knobs: SchedulingKnobs }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduling</CardTitle>
        <CardDescription>
          Crew scheduling knobs. Each setting saves independently.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          key={`age-${knobs.minAgeYears}`}
          action={updateMinAgeYears}
          className="flex flex-wrap items-end gap-2"
        >
          <label className="grid gap-1 text-xs text-muted-foreground">
            Minimum rider age (years)
            <input
              type="number"
              name="value"
              required
              min={0}
              defaultValue={knobs.minAgeYears}
              className={`${inputCls} w-24`}
            />
          </label>
          <Button type="submit" size="sm" variant="outline">
            Save
          </Button>
        </form>

        <form
          key={`open-${knobs.riderSignupOpen.weekday}-${knobs.riderSignupOpen.time}`}
          action={updateRiderSignupOpen}
          className="flex flex-wrap items-end gap-2"
        >
          <label className="grid gap-1 text-xs text-muted-foreground">
            Rider signup opens (weekday)
            <select
              name="weekday"
              defaultValue={knobs.riderSignupOpen.weekday}
              className={inputCls}
            >
              {WEEKDAYS.map((day, i) => (
                <option key={day} value={i}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Time
            <input
              type="time"
              name="time"
              required
              defaultValue={knobs.riderSignupOpen.time}
              className={inputCls}
            />
          </label>
          <Button type="submit" size="sm" variant="outline">
            Save
          </Button>
        </form>

        <form
          key={`rot-${knobs.rotationWeeks}`}
          action={updateRotationWeeks}
          className="flex flex-wrap items-end gap-2"
        >
          <label className="grid gap-1 text-xs text-muted-foreground">
            Rotation length (weeks)
            <input
              type="number"
              name="value"
              required
              min={1}
              defaultValue={knobs.rotationWeeks}
              className={`${inputCls} w-24`}
            />
          </label>
          <Button type="submit" size="sm" variant="outline">
            Save
          </Button>
        </form>

        <form
          key={`unlock-${knobs.dayOfUnlockTime}`}
          action={updateDayOfUnlockTime}
          className="flex flex-wrap items-end gap-2"
        >
          <label className="grid gap-1 text-xs text-muted-foreground">
            Day-of unlock time
            <input
              type="time"
              name="value"
              required
              defaultValue={knobs.dayOfUnlockTime}
              className={inputCls}
            />
          </label>
          <Button type="submit" size="sm" variant="outline">
            Save
          </Button>
        </form>

        <form
          key={`prob-${knobs.probationaryRequiresTrainer}`}
          action={updateProbationaryRequiresTrainer}
          className="flex flex-wrap items-end gap-2"
        >
          <label className="flex items-center gap-2 pb-1 text-sm">
            <input
              type="checkbox"
              name="value"
              defaultChecked={knobs.probationaryRequiresTrainer}
            />
            Probationary members require a trainer on crew
          </label>
          <Button type="submit" size="sm" variant="outline">
            Save
          </Button>
        </form>

        <form
          key={`drop-${knobs.dropDeadline.daysBefore}-${knobs.dropDeadline.time}`}
          action={updateDropDeadline}
          className="flex flex-wrap items-end gap-2"
        >
          <label className="grid gap-1 text-xs text-muted-foreground">
            Drop deadline (days before shift)
            <input
              type="number"
              name="daysBefore"
              required
              min={0}
              defaultValue={knobs.dropDeadline.daysBefore}
              className={`${inputCls} w-24`}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Time
            <input
              type="time"
              name="time"
              required
              defaultValue={knobs.dropDeadline.time}
              className={inputCls}
            />
          </label>
          <Button type="submit" size="sm" variant="outline">
            Save
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CertTypesCard({ types }: { types: CertType[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Certification types</CardTitle>
        <CardDescription>
          Certifications members can submit for verification.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {types.length ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Abbrev.</TableHead>
                  <TableHead>Issuing org</TableHead>
                  <TableHead>Validity (months)</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>{type.abbreviation}</TableCell>
                    <TableCell>{type.issuingOrg ?? <Dash />}</TableCell>
                    <TableCell>
                      {type.defaultValidityMonths ?? <Dash />}
                    </TableCell>
                    <TableCell>
                      {type.active === false ? (
                        <Badge variant="secondary">Inactive</Badge>
                      ) : (
                        <form
                          action={deactivateCertificationType.bind(
                            null,
                            type.id,
                          )}
                        >
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-destructive"
                          >
                            deactivate
                          </Button>
                        </form>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No certification types yet.
          </p>
        )}
        <form
          action={createCertificationType}
          className="flex flex-wrap items-end gap-2"
        >
          <label className="grid gap-1 text-xs text-muted-foreground">
            Name
            <input type="text" name="name" required className={`${inputCls} w-48`} />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Abbreviation
            <input
              type="text"
              name="abbreviation"
              required
              className={`${inputCls} w-24`}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Issuing org (optional)
            <input type="text" name="issuingOrg" className={`${inputCls} w-40`} />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Validity months (optional)
            <input
              type="number"
              name="defaultValidityMonths"
              min={1}
              className={`${inputCls} w-32`}
            />
          </label>
          <Button type="submit" size="sm">
            Add type
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function EventKindsCard({ kinds }: { kinds: EventKind[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Event kinds</CardTitle>
        <CardDescription>Categories for events on the calendar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {kinds.length ? (
          <ul className="space-y-1">
            {kinds.map((kind) => (
              <li key={kind.id} className="flex items-center gap-2 text-sm">
                <span>{kind.name}</span>
                {kind.active === false ? (
                  <Badge variant="secondary">Inactive</Badge>
                ) : (
                  <form action={deactivateEventKind.bind(null, kind.id)}>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-destructive"
                    >
                      deactivate
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No event kinds yet.</p>
        )}
        <form action={createEventKind} className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Name
            <input type="text" name="name" required className={`${inputCls} w-48`} />
          </label>
          <Button type="submit" size="sm">
            Add kind
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function RequirementsCard({
  credentialTypes,
  certTypes,
  evalTemplates,
  classes,
}: {
  credentialTypes: CredentialType[];
  certTypes: CertType[];
  evalTemplates: EvalTemplate[];
  classes: TrainingClass[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Credential requirements</CardTitle>
        <CardDescription>
          What a member must complete before each credential can be granted.
          For the add form, fill in only the field matching the selected kind.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {credentialTypes.map((type) => (
          <div key={type.id} className="space-y-2">
            <h3 className="text-sm font-medium">
              {type.name}{' '}
              <span className="text-xs text-muted-foreground">({formatCredKey(type.key)})</span>
            </h3>
            {type.requirements.length ? (
              <ul className="space-y-1">
                {type.requirements.map((req) => (
                  <li key={req.id} className="flex items-center gap-2 text-sm">
                    <span>{requirementLabel(req)}</span>
                    <form action={removeRequirement.bind(null, req.id)}>
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
              <p className="text-sm text-muted-foreground">No requirements.</p>
            )}
            <form
              action={addRequirement.bind(null, type.id)}
              className="flex flex-wrap items-end gap-2"
            >
              <label className="grid gap-1 text-xs text-muted-foreground">
                Kind
                <select name="kind" required defaultValue="" className={inputCls}>
                  <option value="" disabled>
                    Select kind…
                  </option>
                  <option value="CERTIFICATION">Certification</option>
                  <option value="EVALUATION_COUNT">Evaluation count</option>
                  <option value="CLASS">Class</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Certification type
                <select
                  name="certificationTypeId"
                  defaultValue=""
                  className={inputCls}
                >
                  <option value="">—</option>
                  {certTypes.map((cert) => (
                    <option key={cert.id} value={cert.id}>
                      {cert.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Eval template
                <select name="evalTemplateId" defaultValue="" className={inputCls}>
                  <option value="">—</option>
                  {evalTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} (v{template.version})
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Count
                <input
                  type="number"
                  name="count"
                  min={1}
                  className={`${inputCls} w-20`}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Class
                <select name="classId" defaultValue="" className={inputCls}>
                  <option value="">—</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" size="sm" variant="outline">
                Add requirement
              </Button>
            </form>
          </div>
        ))}
        {!credentialTypes.length ? (
          <p className="text-sm text-muted-foreground">No credential types.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  let knobs: SchedulingKnobs;
  let certTypes: CertType[];
  let kinds: EventKind[];
  let credentialTypes: CredentialType[];
  let evalTemplates: EvalTemplate[];
  let classes: TrainingClass[];
  let roles: RoleOption[];
  try {
    [knobs, certTypes, kinds, credentialTypes, evalTemplates, classes, roles] =
      await Promise.all([
        api<SchedulingKnobs>('/v1/crews/settings'),
        api<CertType[]>('/v1/certifications/types'),
        api<EventKind[]>('/v1/events/kinds'),
        api<CredentialType[]>('/v1/credentials/types'),
        api<EvalTemplate[]>('/v1/evals/templates'),
        api<TrainingClass[]>('/v1/trainings/classes'),
        api<RoleOption[]>('/v1/roles'),
      ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Scheduling knobs, certification types, event kinds, and credential requirements."
      />
      <ErrorBanner message={error} />

      <SchedulingCard knobs={knobs} />
      <CertTypesCard types={certTypes} />
      <EventKindsCard kinds={kinds} />
      <RequirementsCard
        credentialTypes={credentialTypes}
        certTypes={certTypes}
        evalTemplates={evalTemplates}
        classes={classes}
      />
      <LinkedRolesCard credentialTypes={credentialTypes} roles={roles} />
    </div>
  );
}

function LinkedRolesCard({
  credentialTypes,
  roles,
}: {
  credentialTypes: CredentialType[];
  roles: RoleOption[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Credential-conferred roles</CardTitle>
        <CardDescription>
          Members automatically hold the checked roles (and their permissions)
          while the credential is active; suspension or revocation removes
          them. Requires the roles:manage permission to change.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {credentialTypes.map((type) => (
          <form
            key={`${type.id}-${type.linkedRoles.map((l) => l.role.id).sort().join(',')}`}
            action={setCredentialRoles.bind(null, type.id)}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b pb-3 last:border-b-0"
          >
            <span className="w-64 text-sm font-medium">
              {type.name}{' '}
              <span className="text-xs text-muted-foreground">({formatCredKey(type.key)})</span>
            </span>
            {roles.map((role) => (
              <label key={role.id} className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  name="roleIds"
                  value={role.id}
                  defaultChecked={type.linkedRoles.some((l) => l.role.id === role.id)}
                />
                {role.name}
              </label>
            ))}
            <Button type="submit" size="sm" variant="outline" className="h-6 text-xs">
              Save
            </Button>
          </form>
        ))}
      </CardContent>
    </Card>
  );
}
