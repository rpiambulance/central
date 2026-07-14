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
import { addRadio, issueRadio, returnRadio } from './actions';

type Radio = {
  id: number;
  number: string;
  model: string | null;
  serial: string | null;
  retired: boolean;
  assignments: Array<{
    id: number;
    member: { id: number; firstName: string; lastName: string };
  }>;
};

type Member = { id: number; firstName: string; lastName: string };

const inputCls =
  'h-8 rounded-md border border-input bg-background px-2 text-sm';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Radio administration requires additional permissions. If you think
          you should have access, contact an officer.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function Dash() {
  return <span className="text-muted-foreground">&mdash;</span>;
}

export default async function AdminRadiosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  let radios: Radio[];
  let members: Member[];
  try {
    [radios, members] = await Promise.all([
      api<Radio[]>('/v1/radios'),
      api<Member[]>('/v1/members'),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Radios"
        description="Radio inventory and member assignments."
      />
      <ErrorBanner message={error} />

      <Card>
        <CardHeader>
          <CardTitle>Add radio</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addRadio} className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Number
              <input
                type="text"
                name="number"
                required
                className={`${inputCls} w-28`}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Model (optional)
              <input type="text" name="model" className={`${inputCls} w-40`} />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Serial (optional)
              <input type="text" name="serial" className={`${inputCls} w-40`} />
            </label>
            <Button type="submit" size="sm">
              Add radio
            </Button>
          </form>
        </CardContent>
      </Card>

      {radios.length ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Current holder</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {radios.map((radio) => {
                const holder = radio.assignments[0]?.member;
                return (
                  <TableRow key={radio.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {radio.number}
                      {radio.retired ? (
                        <Badge variant="secondary" className="ml-2">
                          Retired
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{radio.model ?? <Dash />}</TableCell>
                    <TableCell>{radio.serial ?? <Dash />}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {holder ? (
                        `${holder.lastName}, ${holder.firstName}`
                      ) : (
                        <Dash />
                      )}
                    </TableCell>
                    <TableCell>
                      {holder ? (
                        <form action={returnRadio.bind(null, radio.id)}>
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-destructive"
                          >
                            return
                          </Button>
                        </form>
                      ) : (
                        <form
                          action={issueRadio.bind(null, radio.id)}
                          className="flex items-center gap-1"
                        >
                          <select
                            name="memberId"
                            required
                            defaultValue=""
                            className={inputCls}
                          >
                            <option value="" disabled>
                              Select member…
                            </option>
                            {members.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.lastName}, {member.firstName}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            className="h-7"
                          >
                            Issue
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
        <p className="text-sm text-muted-foreground">No radios yet.</p>
      )}
    </div>
  );
}
