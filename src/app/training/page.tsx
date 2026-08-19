import { api } from '@/lib/api';
import { prefers12Hour } from '@/lib/me';
import { formatCredKey, formatDate, formatDateOnly, formatDateTime } from '@/lib/format';
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
import { DocumentViewer } from '@/components/document-viewer';
import { PageHeader } from '@/components/page-header';
import {
  amendCertification,
  registerForClass,
  requestPromotion,
  submitCertification,
  withdrawCertification,
} from './actions';

type Certification = {
  id: number;
  identifier: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  rejectionReason: string | null;
  type: { id: number; name: string };
  documents: Array<{ id: string; fileName: string }>;
};

type ChecklistItem = {
  kind: string;
  label: string;
  satisfied: boolean;
  detail?: string;
};

type PromotionPath = {
  credentialTypeId: number;
  key: string;
  name: string;
  requestable: boolean;
  checklist: ChecklistItem[];
};

type Evaluation = {
  id: number;
  status: 'DRAFT' | 'SUBMITTED' | 'SIGNED';
  shiftDate: string | null;
  createdAt: string;
  template: { id: number; name: string };
  evaluator: { id: number; firstName: string; lastName: string };
  subject: { id: number; firstName: string; lastName: string };
};

type AnnualTraining = {
  id: number;
  name: string;
  year: number;
  myCompletion?: string | null;
};

type AttendanceStatus = 'REGISTERED' | 'ATTENDED' | 'COMPLETED' | 'NO_SHOW';

type TrainingClass = {
  id: number;
  name: string;
  description: string | null;
  sessionAt: string | null;
  location: string | null;
  attendance?: Array<{ status: AttendanceStatus }>;
};

const ATTENDANCE_BADGE: Record<
  AttendanceStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' }
> = {
  REGISTERED: { label: 'Registered', variant: 'secondary' },
  ATTENDED: { label: 'Attended', variant: 'secondary' },
  COMPLETED: { label: 'Completed', variant: 'default' },
  NO_SHOW: { label: 'No show', variant: 'destructive' },
};

const CERT_STATUS_BADGE: Record<
  Certification['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' }
> = {
  VERIFIED: { label: 'Verified', variant: 'default' },
  PENDING_VERIFICATION: { label: 'Pending', variant: 'secondary' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
};

const EVAL_STATUS_BADGE: Record<
  Evaluation['status'],
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  DRAFT: { label: 'Draft', variant: 'outline' },
  SUBMITTED: { label: 'Submitted', variant: 'secondary' },
  SIGNED: { label: 'Signed', variant: 'default' },
};

const CERT_FIELD =
  'h-8 rounded-md border border-input bg-background px-2 text-sm';

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checklistFor?: string }>;
}) {
  const hour12 = await prefers12Hour();
  const [{ error }, certs, promotions, evals, annual, classes] =
    await Promise.all([
      searchParams,
      api<Certification[]>('/v1/certifications/mine'),
      api<PromotionPath[]>('/v1/promotions/eligible'),
      api<Evaluation[]>('/v1/evals/mine'),
      api<AnnualTraining[]>('/v1/trainings/annual'),
      api<TrainingClass[]>('/v1/trainings/classes'),
    ]);
  // "What do I need for X?" — works for any credential, including ones the
  // member is not yet eligible to request, which the promotion paths omit.
  const { checklistFor } = await searchParams;
  const allCredentialTypes = await api<
    Array<{ id: number; key: string; name: string }>
  >('/v1/credentials/types');
  const chosenCredential = allCredentialTypes.find(
    (t) => String(t.id) === checklistFor,
  );
  const chosenChecklist = chosenCredential
    ? await api<ChecklistItem[]>(
        `/v1/credentials/my-checklist/${chosenCredential.id}`,
      )
    : null;

  const certTypes =
    await api<Array<{ id: number; name: string; defaultValidityMonths: number | null }>>(
      '/v1/certifications/types',
    );

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Training"
        description="Your certifications, promotion progress, and evaluations."
      />
      <ErrorBanner message={error} />

      <section className="space-y-3">
        <h2 className="text-lg font-medium tracking-tight">
          My Certifications
        </h2>
        {certs.length ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certification</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {certs.map((cert) => {
                  const badge = CERT_STATUS_BADGE[cert.status];
                  return (
                    <TableRow key={cert.id}>
                      <TableCell className="font-medium">
                        {cert.type.name}
                        {cert.identifier ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            #{cert.identifier}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        {/*
                          Spelled out rather than left in a tooltip: it is the
                          one thing that tells them what to fix, and a tooltip
                          does not exist on a phone.
                        */}
                        {cert.status === 'REJECTED' ? (
                          <p className="mt-1 max-w-64 text-xs text-destructive">
                            {cert.rejectionReason
                              ? cert.rejectionReason
                              : 'No reason was given — ask a training officer what to change.'}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {cert.expiresAt ? (
                          formatDateOnly(cert.expiresAt)
                        ) : (
                          <span className="text-muted-foreground">
                            Does not expire
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <DocumentViewer
                          documents={cert.documents}
                          title={cert.type.name}
                        />
                      </TableCell>
                      <TableCell>
                        {/* Editing a verified record sends it back for
                            checking, so the disclosure says so. */}
                        <details>
                          <summary className="cursor-pointer text-xs text-muted-foreground">
                            Correct
                          </summary>
                          <div className="mt-2 space-y-2">
                            <form
                              action={amendCertification.bind(null, cert.id)}
                              className="flex flex-wrap items-end gap-2"
                            >
                              <label className="grid gap-1 text-xs text-muted-foreground">
                                Number
                                <input
                                  name="identifier"
                                  defaultValue={cert.identifier ?? ''}
                                  className={CERT_FIELD}
                                />
                              </label>
                              <label className="grid gap-1 text-xs text-muted-foreground">
                                Issued
                                <input
                                  name="issuedAt"
                                  type="date"
                                  defaultValue={cert.issuedAt?.slice(0, 10) ?? ''}
                                  className={CERT_FIELD}
                                />
                              </label>
                              <label className="grid gap-1 text-xs text-muted-foreground">
                                Expires
                                <input
                                  name="expiresAt"
                                  type="date"
                                  defaultValue={cert.expiresAt?.slice(0, 10) ?? ''}
                                  className={CERT_FIELD}
                                />
                              </label>
                              <Button type="submit" size="sm" variant="outline">
                                Save
                              </Button>
                            </form>
                            <form action={withdrawCertification.bind(null, cert.id)}>
                              <Button
                                type="submit"
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs text-destructive"
                              >
                                Withdraw this certification
                              </Button>
                            </form>
                            {cert.status === 'VERIFIED' ? (
                              <p className="text-xs text-muted-foreground">
                                Saving a change sends this back for
                                verification.
                              </p>
                            ) : null}
                          </div>
                        </details>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No certifications on file.
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a certification</CardTitle>
            <CardDescription>
              Submitted for verification by an officer. Attach a photo or scan
              of the card if you have one — it speeds that up. Leave the expiry
              blank and it is worked out from the issue date.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={submitCertification}
              className="flex flex-wrap items-end gap-2"
            >
              <label className="grid gap-1 text-xs text-muted-foreground">
                Certification
                <select
                  name="typeId"
                  required
                  defaultValue=""
                  className={CERT_FIELD}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {certTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Number (optional)
                <input name="identifier" className={CERT_FIELD} />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Issued
                <input name="issuedAt" type="date" className={CERT_FIELD} />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Expires (optional)
                <input name="expiresAt" type="date" className={CERT_FIELD} />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Card photo or scan (optional)
                <input
                  name="document"
                  type="file"
                  accept="image/*,application/pdf"
                  className="text-sm"
                />
              </label>
              <Button type="submit" size="sm" variant="outline" className="h-8">
                Submit
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium tracking-tight">
          Requirements for any credential
        </h2>
        <Card>
          <CardHeader>
            <CardDescription>
              Check what a credential needs, whether or not you can request it
              yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form method="get" className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Credential
                <select
                  name="checklistFor"
                  defaultValue={checklistFor ?? ''}
                  className={CERT_FIELD}
                >
                  <option value="">Select…</option>
                  {allCredentialTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {formatCredKey(type.key)} — {type.name}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" size="sm" variant="outline" className="h-8">
                Show
              </Button>
            </form>
            {chosenChecklist ? (
              chosenChecklist.length ? (
                <ul className="space-y-1 text-sm">
                  {chosenChecklist.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span
                        className={
                          item.satisfied
                            ? 'text-green-600 dark:text-green-500'
                            : 'text-muted-foreground'
                        }
                      >
                        {item.satisfied ? '✓' : '○'}
                      </span>
                      <span
                        className={
                          item.satisfied ? '' : 'text-muted-foreground'
                        }
                      >
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {chosenCredential?.name} has no recorded requirements.
                </p>
              )
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium tracking-tight">Promotion Paths</h2>
        {promotions.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {promotions.map((path) => (
              <Card key={path.credentialTypeId}>
                <CardHeader>
                  <CardTitle className="text-base">{path.name}</CardTitle>
                  <CardDescription>
                    Requirements for {formatCredKey(path.key)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-1 text-sm">
                    {path.checklist.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span
                          aria-hidden
                          className={
                            item.satisfied
                              ? 'text-green-600 dark:text-green-500'
                              : 'text-muted-foreground'
                          }
                        >
                          {item.satisfied ? '✓' : '✗'}
                        </span>
                        <span
                          className={
                            item.satisfied ? '' : 'text-muted-foreground'
                          }
                        >
                          {item.label}
                          {item.detail ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({item.detail})
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {path.requestable ? (
                    <form
                      action={requestPromotion.bind(
                        null,
                        path.credentialTypeId,
                      )}
                    >
                      <Button type="submit" size="sm">
                        Request promotion
                      </Button>
                    </form>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No promotion paths available right now.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium tracking-tight">My Evaluations</h2>
        {evals.length ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form</TableHead>
                  <TableHead>Evaluator</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evals.map((ev) => {
                  const badge = EVAL_STATUS_BADGE[ev.status];
                  return (
                    <TableRow key={ev.id}>
                      <TableCell className="font-medium">
                        {ev.template.name}
                      </TableCell>
                      <TableCell>
                        {ev.evaluator.firstName} {ev.evaluator.lastName}
                      </TableCell>
                      <TableCell>
                        {ev.subject.firstName} {ev.subject.lastName}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {ev.shiftDate ? formatDateOnly(ev.shiftDate) : formatDate(ev.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No evaluations yet.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium tracking-tight">
          Annual Trainings &amp; Classes
        </h2>
        {annual.length ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requirement</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {annual.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.name}</TableCell>
                    <TableCell>{req.year}</TableCell>
                    <TableCell>
                      {req.myCompletion ? (
                        <Badge
                          variant="default"
                          title={formatDate(req.myCompletion)}
                        >
                          Done
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not done</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No annual training requirements.
          </p>
        )}

        {classes.length ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>My attendance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((cls) => {
                  const mine = cls.attendance?.[0];
                  return (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">
                        {cls.name}
                        {cls.description ? (
                          <span className="block text-xs text-muted-foreground">
                            {cls.description}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {cls.sessionAt ? (
                          formatDateTime(cls.sessionAt, hour12)
                        ) : (
                          <span className="text-muted-foreground">TBD</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {cls.location ?? (
                          <span className="text-muted-foreground">
                            &mdash;
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {mine ? (
                          <Badge variant={ATTENDANCE_BADGE[mine.status].variant}>
                            {ATTENDANCE_BADGE[mine.status].label}
                          </Badge>
                        ) : (
                          <form action={registerForClass.bind(null, cls.id)}>
                            <Button
                              type="submit"
                              variant="outline"
                              size="sm"
                              className="h-7"
                            >
                              Register
                            </Button>
                          </form>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No classes scheduled.
          </p>
        )}
      </section>
    </div>
  );
}
