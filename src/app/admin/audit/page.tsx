import { api, ApiError } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
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
import { PageHeader } from '@/components/page-header';
import { formatDateTime } from '@/lib/format';

type AuditEntry = {
  id: string;
  actorType: 'MEMBER' | 'API_TOKEN' | 'SYSTEM';
  actorName: string;
  action: string;
  entity: string;
  entityId: string | null;
  diff: unknown;
  at: string;
};

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          The audit log requires the audit:read permission.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string }>;
}) {
  const { limit } = await searchParams;
  const take = limit && /^\d+$/.test(limit) ? Math.min(Number(limit), 500) : 100;

  let entries: AuditEntry[];
  try {
    entries = await api<AuditEntry[]>(`/v1/audit?limit=${take}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description={`Sensitive mutations across the system — newest first (showing ${entries.length}).`}
      />

      {entries.length ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDateTime(entry.at)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="text-sm">{entry.actorName}</span>{' '}
                    <Badge
                      variant={entry.actorType === 'SYSTEM' ? 'outline' : 'secondary'}
                      className="text-[10px]"
                    >
                      {entry.actorType === 'API_TOKEN' ? 'token' : entry.actorType.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{entry.action}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {entry.entity}
                    {entry.entityId ? ` #${entry.entityId}` : ''}
                  </TableCell>
                  <TableCell>
                    {entry.diff != null ? (
                      <details className="max-w-md text-xs text-muted-foreground">
                        <summary className="cursor-pointer">diff</summary>
                        <pre className="mt-1 overflow-x-auto rounded-md bg-muted p-2">
                          {JSON.stringify(entry.diff, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No audit entries yet.</p>
      )}

      {entries.length === take ? (
        <a
          href={`/admin/audit?limit=${Math.min(take * 2, 500)}`}
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Show more
        </a>
      ) : null}
    </div>
  );
}
