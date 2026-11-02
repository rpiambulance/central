import { api } from '@/lib/api';
import { myPermissions } from '@/lib/me';
import { formatCredKey } from '@/lib/format';
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
import { addDatedRequirement, removeDatedRequirement } from './actions';
import { DateFields, datesSummary, type Dated } from './date-fields';
import { DatesEditor } from './dates-editor';

type Requirement = Dated & {
  id: number;
  kind: 'CERTIFICATION' | 'EVALUATION_COUNT' | 'CLASS' | 'CHECKLIST';
  scope: 'PROMOTION' | 'ONGOING' | 'BOTH';
  alternativeGroup: string | null;
  count: number | null;
  certificationType: { name: string } | null;
  evalTemplate: { name: string } | null;
  class: { name: string } | null;
  classSeries: { name: string; validityMonths: number | null } | null;
};

type CredentialType = {
  id: number;
  key: string;
  name: string;
  requirements: Requirement[];
};

type Named = { id: number; name: string };

const FIELD = 'h-8 rounded-md border border-input bg-background px-2 text-sm';
const LABEL = 'grid gap-1 text-xs text-muted-foreground';

const SCOPE_LABEL: Record<Requirement['scope'], string> = {
  PROMOTION: 'at promotion',
  ONGOING: 'ongoing',
  BOTH: 'promotion and ongoing',
};

export const dynamic = 'force-dynamic';

function requirementLabel(req: Requirement): string {
  if (req.kind === 'CERTIFICATION') {
    return `Certification: ${req.certificationType?.name ?? 'unknown'}`;
  }
  if (req.kind === 'EVALUATION_COUNT') {
    return `${req.count ?? 1} × evaluation: ${req.evalTemplate?.name ?? 'unknown'}`;
  }
  if (req.kind === 'CHECKLIST') {
    return `Checklist: ${req.evalTemplate?.name ?? 'unknown'}`;
  }
  if (req.classSeries) return `Any session of: ${req.classSeries.name}`;
  return `Class: ${req.class?.name ?? 'unknown'}`;
}

/** Seasonal or renewing — the kind this page made, and may take away. */
function isDated(req: Requirement): boolean {
  return Boolean(
    req.classSeries ||
      req.effectiveFrom ||
      req.effectiveUntil ||
      req.countsFrom ||
      req.validThrough,
  );
}

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Setting when credential requirements apply needs
          credentials:requirement-dates.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

/**
 * When credential requirements apply, and what renews them.
 *
 * What a requirement is — the card, the class, whether it is checked at
 * promotion or ongoing — is set up in Admin. Its dates are set here: when it
 * takes effect, when a season ends, how recent proof has to be, when a
 * renewal cycle closes. Seasonal and renewing requirements are made here
 * too, since they are nothing but a requirement and its dates.
 */
export default async function RequirementDatesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const permissions = await myPermissions();
  if (!permissions.has('credentials:requirement-dates')) return <NoAccess />;

  const [credentialTypes, certTypes, templates, classes, series] =
    await Promise.all([
      api<CredentialType[]>('/v1/credentials/types'),
      api<Named[]>('/v1/certifications/types'),
      api<Array<Named & { version: number; kind?: 'EVALUATION' | 'CHECKLIST' }>>(
        '/v1/evals/templates',
      ),
      api<Named[]>('/v1/trainings/classes'),
      api<Array<Named & { validityMonths: number | null; active: boolean }>>(
        '/v1/trainings/series',
      ),
    ]);
  const withRequirements = credentialTypes.filter((type) => type.requirements.length);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requirement Dates"
        description="When credential requirements apply, and what renews them. What each requirement is, is set up in Admin."
      />
      <ErrorBanner message={error} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How the dates work</CardTitle>
          <CardDescription>
            <strong>In force from / until</strong> make a requirement seasonal:
            it suspends nobody before it starts — holders who have not met it
            are reminded 14 and 3 days ahead — and anybody suspended only for it
            gets the credential back once it ends.{' '}
            <strong>Counts if done on or after</strong> means older proof does
            not count, so last season&apos;s flu shot is not this season&apos;s.{' '}
            <strong>Good through</strong> ends a renewal cycle for everybody:
            the requirement carries on, but nothing counts past it until the
            next cycle&apos;s dates are set here — you are reminded 30 and 7
            days ahead. A <strong>class series</strong> renews on its own:
            each session counts for as long as the series says, set on the
            Trainings page.
          </CardDescription>
        </CardHeader>
      </Card>

      {withRequirements.map((type) => (
        <Card key={type.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {type.name}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                ({formatCredKey(type.key)})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {type.requirements.map((req) => {
                const dates = datesSummary(req);
                return (
                  <li key={req.id} className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span>{requirementLabel(req)}</span>
                      {req.alternativeGroup ? (
                        <span className="text-xs text-muted-foreground">
                          (either/or: {req.alternativeGroup})
                        </span>
                      ) : null}
                      <Badge variant={req.scope === 'PROMOTION' ? 'secondary' : 'default'}>
                        {SCOPE_LABEL[req.scope]}
                      </Badge>
                      {dates ? (
                        <span className="text-xs text-muted-foreground">{dates}</span>
                      ) : null}
                      {isDated(req) ? (
                        <form action={removeDatedRequirement.bind(null, req.id)}>
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-destructive"
                          >
                            remove
                          </Button>
                        </form>
                      ) : null}
                    </div>
                    <DatesEditor
                      requirementId={req.id}
                      dates={req}
                      ongoing={req.scope !== 'PROMOTION'}
                      className={FIELD}
                    />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ))}
      {!withRequirements.length ? (
        <p className="text-sm text-muted-foreground">No credential requirements yet.</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a seasonal or renewing requirement</CardTitle>
          <CardDescription>
            Give it at least one date, or pick a class series. Fill in only the
            field matching the kind. It applies to holders of the credential
            and of every credential above it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addDatedRequirement} className="flex flex-wrap items-end gap-2">
            <label className={LABEL}>
              Credential
              <select name="credentialTypeId" required defaultValue="" className={FIELD}>
                <option value="" disabled>
                  Select…
                </option>
                {credentialTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL}>
              Kind
              <select name="kind" required defaultValue="" className={FIELD}>
                <option value="" disabled>
                  Select…
                </option>
                <option value="CERTIFICATION">Certification</option>
                <option value="CLASS">Class or class series</option>
                <option value="EVALUATION_COUNT">Evaluation count</option>
                <option value="CHECKLIST">Checklist</option>
              </select>
            </label>
            <label className={LABEL}>
              Checked
              <select name="scope" defaultValue="ONGOING" className={FIELD}>
                <option value="ONGOING">Ongoing</option>
                <option value="BOTH">At promotion and ongoing</option>
              </select>
            </label>
            <label className={LABEL}>
              Certification type
              <select name="certificationTypeId" defaultValue="" className={FIELD}>
                <option value="">—</option>
                {certTypes.map((cert) => (
                  <option key={cert.id} value={cert.id}>
                    {cert.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL}>
              Class series
              <select name="classSeriesId" defaultValue="" className={FIELD}>
                <option value="">—</option>
                {series
                  .filter((one) => one.active)
                  .map((one) => (
                    <option key={one.id} value={one.id}>
                      {one.name}
                      {one.validityMonths ? ` (${one.validityMonths} mo)` : ''}
                    </option>
                  ))}
              </select>
            </label>
            <label className={LABEL}>
              or one class
              <select name="classId" defaultValue="" className={FIELD}>
                <option value="">—</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL}>
              Evaluation or checklist
              <select name="evalTemplateId" defaultValue="" className={FIELD}>
                <option value="">—</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.kind === 'CHECKLIST' ? 'Checklist: ' : ''}
                    {template.name} (v{template.version})
                  </option>
                ))}
              </select>
            </label>
            <label className={LABEL}>
              Count
              <input type="number" name="count" min={1} className={`${FIELD} w-20`} />
            </label>
            <label className={LABEL}>
              Either/or group (optional)
              <input
                name="alternativeGroup"
                placeholder="Flu vaccination"
                title="Give two requirements the same label and meeting either one is enough."
                className={FIELD}
              />
            </label>
            <DateFields className={FIELD} />
            <Button type="submit" size="sm">
              Add requirement
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
