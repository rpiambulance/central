import { api } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
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
import { registerForClass, requestPromotion } from './actions';

type Certification = {
  id: number;
  identifier: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  rejectionReason: string | null;
  type: { id: number; name: string };
  documents: Array<{ id: number; fileName: string }>;
};

type PromotionPath = {
  credentialTypeId: number;
  key: string;
  name: string;
  requestable: boolean;
  checklist: Array<{
    kind: string;
    label: string;
    satisfied: boolean;
    detail?: string;
  }>;
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

export default async function TrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, certs, promotions, evals, annual, classes] =
    await Promise.all([
      searchParams,
      api<Certification[]>('/v1/certifications/mine'),
      api<PromotionPath[]>('/v1/promotions/eligible'),
      api<Evaluation[]>('/v1/evals/mine'),
      api<AnnualTraining[]>('/v1/trainings/annual'),
      api<TrainingClass[]>('/v1/trainings/classes'),
    ]);

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
                        <Badge
                          variant={badge.variant}
                          title={cert.rejectionReason ?? undefined}
                        >
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {cert.expiresAt ? (
                          formatDate(cert.expiresAt)
                        ) : (
                          <span className="text-muted-foreground">
                            Does not expire
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {cert.documents.length
                          ? `${cert.documents.length} file${cert.documents.length === 1 ? '' : 's'}`
                          : '—'}
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
                    Requirements for {path.key}
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
                        {formatDate(ev.shiftDate ?? ev.createdAt)}
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
                          formatDateTime(cls.sessionAt)
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
