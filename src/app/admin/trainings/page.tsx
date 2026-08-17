import Link from 'next/link';
import { prefers12Hour } from '@/lib/me';
import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
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
import { setBlocksScheduling, createAnnualRequirement, createClass, setAlertOnLapse } from './actions';

type AnnualRequirement = {
  id: number;
  name: string;
  year: number;
  alertOnLapse: boolean;
  blocksScheduling: boolean;
  active: boolean;
};

type TrainingClass = {
  id: number;
  name: string;
  description: string | null;
  sessionAt: string | null;
  location: string | null;
  _count?: { attendance: number };
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

function Dash() {
  return <span className="text-muted-foreground">&mdash;</span>;
}

export default async function AdminTrainingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const hour12 = await prefers12Hour();
  const { error } = await searchParams;

  let annual: AnnualRequirement[];
  let classes: TrainingClass[];
  try {
    [annual, classes] = await Promise.all([
      api<AnnualRequirement[]>('/v1/trainings/annual'),
      api<TrainingClass[]>('/v1/trainings/classes'),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Trainings"
        description="Annual training requirements and in-house classes."
      />
      <ErrorBanner message={error} />

      <section className="space-y-4">
        <h2 className="text-lg font-medium tracking-tight">
          Annual requirements
        </h2>
        {annual.length ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Alert on lapse</TableHead>
                  <TableHead>Blocks scheduling</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {annual.map((requirement) => (
                  <TableRow key={requirement.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      <Link
                        href={`/admin/trainings/annual/${requirement.id}`}
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        {requirement.name}
                      </Link>
                    </TableCell>
                    <TableCell>{requirement.year}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {requirement.alertOnLapse ? (
                          <Badge>On</Badge>
                        ) : (
                          <Badge variant="secondary">Off</Badge>
                        )}
                        <form
                          action={setAlertOnLapse.bind(
                            null,
                            requirement.id,
                            !requirement.alertOnLapse,
                          )}
                        >
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                          >
                            {requirement.alertOnLapse ? 'disable' : 'enable'}
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {requirement.blocksScheduling ? (
                          <Badge variant="destructive">Blocks crews</Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                        <form
                          action={setBlocksScheduling.bind(
                            null,
                            requirement.id,
                            !requirement.blocksScheduling,
                          )}
                        >
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                          >
                            {requirement.blocksScheduling ? 'unblock' : 'block'}
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
            No annual requirements yet.
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Add annual requirement</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={createAnnualRequirement}
              className="flex flex-wrap items-end gap-2"
            >
              <label className="grid gap-1 text-xs text-muted-foreground">
                Name
                <input
                  type="text"
                  name="name"
                  required
                  className={`${inputCls} w-56`}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Year
                <input
                  type="number"
                  name="year"
                  required
                  defaultValue={new Date().getFullYear()}
                  className={`${inputCls} w-24`}
                />
              </label>
              <label className="flex items-center gap-2 pb-1 text-sm">
                <input type="checkbox" name="alertOnLapse" />
                Alert on lapse
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="blocksScheduling" />
                Outstanding completion blocks night-crew signup
              </label>
              <Button type="submit" size="sm">
                Add requirement
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium tracking-tight">Classes</h2>
        {classes.length ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Attendance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      <Link
                        href={`/admin/trainings/classes/${cls.id}`}
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        {cls.name}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {cls.sessionAt ? formatDateTime(cls.sessionAt, hour12) : <Dash />}
                    </TableCell>
                    <TableCell>{cls.location ?? <Dash />}</TableCell>
                    <TableCell>{cls._count?.attendance ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No classes yet.</p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Add class</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createClass} className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Name
                <input
                  type="text"
                  name="name"
                  required
                  className={`${inputCls} w-56`}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Description (optional)
                <input
                  type="text"
                  name="description"
                  className={`${inputCls} w-64`}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Session (optional)
                <input
                  type="datetime-local"
                  name="sessionAt"
                  className={inputCls}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Location (optional)
                <input type="text" name="location" className={`${inputCls} w-40`} />
              </label>
              <Button type="submit" size="sm">
                Add class
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
