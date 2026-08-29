import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { prefers12Hour } from '@/lib/me';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';

type Run = {
  id: number;
  completedAt: string;
  comment: string | null;
  template: { id: number; name: string };
  asset: { id: number; name: string } | null;
  completedBy: { id: number; firstName: string; lastName: string } | null;
};

export const dynamic = 'force-dynamic';

export default async function RunsPage() {
  const [runs, hour12] = await Promise.all([
    api<Run[]>('/v1/checksheets/runs'),
    prefers12Hour(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Completed checksheets"
        description="Every check that has been recorded, most recent first."
      />
      {runs.length ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Sheet</TableHead>
                <TableHead>Where</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Comment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="whitespace-nowrap">
                    <Link
                      href={`/checksheets/runs/${run.id}`}
                      className="underline underline-offset-2"
                    >
                      {formatDateTime(run.completedAt, hour12)}
                    </Link>
                  </TableCell>
                  <TableCell>{run.template.name}</TableCell>
                  <TableCell>{run.asset?.name ?? '—'}</TableCell>
                  <TableCell>
                    {run.completedBy
                      ? `${run.completedBy.firstName} ${run.completedBy.lastName}`
                      : '—'}
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-muted-foreground">
                    {run.comment ?? ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No checks recorded yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
