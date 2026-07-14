import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
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
import { setAttendance } from './actions';

const STATUSES = ['REGISTERED', 'ATTENDED', 'COMPLETED', 'NO_SHOW'] as const;

type ClassDetail = {
  id: number;
  name: string;
  description: string | null;
  sessionAt: string | null;
  location: string | null;
  attendance: Array<{
    status: (typeof STATUSES)[number];
    member: { id: number; firstName: string; lastName: string };
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
          Training administration requires additional permissions. If you think
          you should have access, contact an officer.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function ClassRosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const classId = Number(id);

  let cls: ClassDetail;
  try {
    cls = await api<ClassDetail>(`/v1/trainings/classes/${classId}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={cls.name}
        description={[
          cls.description,
          cls.sessionAt ? formatDateTime(cls.sessionAt) : null,
          cls.location,
        ]
          .filter(Boolean)
          .join(' · ')}
      />
      <div>
        <Link
          href="/admin/trainings"
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          &larr; All trainings
        </Link>
      </div>
      <ErrorBanner message={error} />

      {cls.attendance.length ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cls.attendance.map((row) => (
                <TableRow key={row.member.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {row.member.lastName}, {row.member.firstName}
                  </TableCell>
                  <TableCell>
                    <form
                      action={setAttendance.bind(null, classId, row.member.id)}
                      className="flex items-center gap-2"
                    >
                      <select
                        name="status"
                        defaultValue={row.status}
                        className={inputCls}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        className="h-7"
                      >
                        Save
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nobody has registered for this class.
        </p>
      )}
    </div>
  );
}
