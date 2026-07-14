import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
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
import { markComplete, unmarkComplete } from './actions';

type AnnualRequirement = {
  id: number;
  name: string;
  year: number;
};

type CompletionRow = {
  member: { id: number; firstName: string; lastName: string };
  completedAt: string | null;
};

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

export default async function AnnualCompletionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const requirementId = Number(id);

  let completions: CompletionRow[];
  let annual: AnnualRequirement[];
  try {
    [completions, annual] = await Promise.all([
      api<CompletionRow[]>(`/v1/trainings/annual/${requirementId}/completions`),
      api<AnnualRequirement[]>('/v1/trainings/annual'),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  const requirement = annual.find((r) => r.id === requirementId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          requirement
            ? `${requirement.name} (${requirement.year})`
            : 'Annual requirement'
        }
        description="Completion roster for active members."
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {completions.map((row) => (
              <TableRow key={row.member.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  {row.member.lastName}, {row.member.firstName}
                </TableCell>
                <TableCell>
                  {row.completedAt ? (
                    <Badge>Completed {formatDate(row.completedAt)}</Badge>
                  ) : (
                    <Badge variant="secondary">Incomplete</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {row.completedAt ? (
                    <form
                      action={unmarkComplete.bind(
                        null,
                        requirementId,
                        row.member.id,
                      )}
                    >
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-destructive"
                      >
                        unmark
                      </Button>
                    </form>
                  ) : (
                    <form
                      action={markComplete.bind(
                        null,
                        requirementId,
                        row.member.id,
                      )}
                    >
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        className="h-7"
                      >
                        Mark complete
                      </Button>
                    </form>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
