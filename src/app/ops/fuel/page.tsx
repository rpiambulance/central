import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
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
import { addFuelEntry } from './actions';

type FuelEntry = {
  id: number;
  loggedAt: string;
  vehicle: string;
  amount: string | number; // Prisma Decimal serializes as a string
  mileage: number;
  member: { id: number; firstName: string; lastName: string };
};

export default async function FuelLogPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, entries] = await Promise.all([
    searchParams,
    api<FuelEntry[]>('/v1/fuel'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fuel Log"
        description="Record fuel purchases for the ambulances."
      />
      <ErrorBanner message={error} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add entry</CardTitle>
          <CardDescription>Log a fill-up.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={addFuelEntry}
            className="flex flex-wrap items-end gap-3"
          >
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">When</span>
              <input
                type="datetime-local"
                name="loggedAt"
                required
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Vehicle</span>
              <input
                type="text"
                name="vehicle"
                required
                placeholder="A1"
                className="h-9 w-28 rounded-md border border-input bg-background px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Amount (gal)</span>
              <input
                type="number"
                name="amount"
                required
                step="0.01"
                min="0"
                className="h-9 w-28 rounded-md border border-input bg-background px-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Mileage</span>
              <input
                type="number"
                name="mileage"
                required
                min="0"
                className="h-9 w-32 rounded-md border border-input bg-background px-2 text-sm"
              />
            </label>
            <Button type="submit" size="sm">
              Add entry
            </Button>
          </form>
        </CardContent>
      </Card>

      {entries.length ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Mileage</TableHead>
                <TableHead>Logged by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(entry.loggedAt)}
                  </TableCell>
                  <TableCell className="font-medium">{entry.vehicle}</TableCell>
                  <TableCell>{entry.amount}</TableCell>
                  <TableCell>{entry.mileage.toLocaleString()}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {entry.member.firstName} {entry.member.lastName}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No fuel entries yet.</p>
      )}
    </div>
  );
}
