import { api } from '@/lib/api';
import { formatDateOnly, formatDateTime } from '@/lib/format';
import { prefers12Hour } from '@/lib/me';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
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

type Row = {
  expiresAt: string;
  expired: boolean;
  item: { id: number; label: string };
  asset: { id: number; name: string } | null;
  template: { id: number; name: string };
  lastCheckedAt: string;
};

export const dynamic = 'force-dynamic';

export default async function ExpiringPage({
  searchParams,
}: {
  searchParams: Promise<{ withinDays?: string }>;
}) {
  const { withinDays } = await searchParams;
  const days = withinDays && Number(withinDays) > 0 ? Number(withinDays) : 60;
  const [rows, hour12] = await Promise.all([
    api<Row[]>(`/v1/checksheets/expiring?withinDays=${days}`),
    prefers12Hour(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expiring soon"
        description={`Dated items due within ${days} days, as of the most recent check of each.`}
      />
      {rows.length ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Where</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Last checked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={`${row.item.id}-${row.asset?.id ?? 0}-${index}`}>
                  <TableCell className="font-medium">{row.item.label}</TableCell>
                  <TableCell>
                    {row.asset?.name ?? row.template.name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateOnly(row.expiresAt)}{' '}
                    {row.expired ? (
                      <Badge variant="destructive">expired</Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(row.lastCheckedAt, hour12)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nothing expiring in the next {days} days.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
