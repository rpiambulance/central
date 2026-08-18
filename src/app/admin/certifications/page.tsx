import { api, ApiError } from '@/lib/api';
import { formatDate, formatDateOnly } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  Card,
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
import { approveCertification, rejectCertification } from './actions';

type PendingCert = {
  id: number;
  identifier: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  type: { name: string };
  member: { id: number; firstName: string; lastName: string };
  documents: Array<{ id: string; fileName: string }>;
};

type ExpiringCert = {
  id: number;
  expiresAt: string | null;
  type: { name: string };
  member: { id: number; firstName: string; lastName: string };
};

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Certification verification requires additional permissions. If you
          think you should have access, contact an officer.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function Dash() {
  return <span className="text-muted-foreground">&mdash;</span>;
}

export default async function AdminCertificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  let pending: PendingCert[];
  let expiring: ExpiringCert[];
  try {
    [pending, expiring] = await Promise.all([
      api<PendingCert[]>('/v1/certifications/pending'),
      api<ExpiringCert[]>('/v1/certifications/expiring?withinDays=60'),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Certifications"
        description="Verify pending certification submissions and monitor upcoming expirations."
      />
      <ErrorBanner message={error} />

      <section className="space-y-2">
        <h2 className="text-lg font-medium tracking-tight">
          Verification queue
        </h2>
        {pending.length ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Identifier</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {cert.member.lastName}, {cert.member.firstName}
                    </TableCell>
                    <TableCell>{cert.type.name}</TableCell>
                    <TableCell>{cert.identifier ?? <Dash />}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {cert.issuedAt ? formatDateOnly(cert.issuedAt) : <Dash />}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {cert.expiresAt ? formatDateOnly(cert.expiresAt) : <Dash />}
                    </TableCell>
                    <TableCell>
                      {cert.documents.length ? (
                        <ul className="space-y-1">
                          {cert.documents.map((doc) => (
                            <li key={doc.id}>
                              <a
                                href={`/certifications/documents/${doc.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm underline underline-offset-2 hover:text-foreground"
                              >
                                {doc.fileName}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <Dash />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <form action={approveCertification.bind(null, cert.id)}>
                          <Button type="submit" size="sm" className="h-7">
                            Approve
                          </Button>
                        </form>
                        <form
                          action={rejectCertification.bind(null, cert.id)}
                          className="flex items-center gap-1"
                        >
                          <input
                            type="text"
                            name="reason"
                            placeholder="Reason"
                            className="h-7 w-32 rounded-md border border-input bg-background px-2 text-xs"
                          />
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            className="h-7 text-destructive"
                          >
                            Reject
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing waiting for verification.
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium tracking-tight">
          Expiring within 60 days
        </h2>
        {expiring.length ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiring.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {cert.member.lastName}, {cert.member.firstName}
                    </TableCell>
                    <TableCell>{cert.type.name}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {cert.expiresAt ? formatDateOnly(cert.expiresAt) : <Dash />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No verified certifications expire in the next 60 days.
          </p>
        )}
      </section>
    </div>
  );
}
