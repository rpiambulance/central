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
import { addVehicle, setVehicleActive } from './actions';

type Vehicle = {
  id: number;
  name: string;
  make: string | null;
  model: string | null;
  year: number | null;
  plate: string | null;
  vin: string | null;
  notes: string | null;
  active: boolean;
};

const inputCls =
  'h-8 rounded-md border border-input bg-background px-2 text-sm';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Vehicle management requires additional permissions.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function AdminVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  let vehicles: Vehicle[];
  try {
    vehicles = await api<Vehicle[]>('/v1/vehicles?includeRetired=true');
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        description="Fleet vehicles available in the fuel log."
      />
      <ErrorBanner message={error} />

      <section className="space-y-2">
        {vehicles.length ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Make / model / year</TableHead>
                  <TableHead>Plate</TableHead>
                  <TableHead>VIN</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">{vehicle.name}</TableCell>
                    <TableCell>
                      {[vehicle.make, vehicle.model, vehicle.year]
                        .filter(Boolean)
                        .join(' ') || '—'}
                    </TableCell>
                    <TableCell>{vehicle.plate ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {vehicle.vin ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-48 text-xs text-muted-foreground">
                      {vehicle.notes ?? '—'}
                    </TableCell>
                    <TableCell>
                      {vehicle.active ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Badge variant="secondary">Retired</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <form
                        action={setVehicleActive.bind(
                          null,
                          vehicle.id,
                          !vehicle.active,
                        )}
                      >
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                        >
                          {vehicle.active ? 'retire' : 'reactivate'}
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No vehicles yet.</p>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Add vehicle</CardTitle>
          <CardDescription>
            Name is what appears in the fuel log (e.g. &ldquo;A-1&rdquo;).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addVehicle} className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Name
              <input name="name" required className={`${inputCls} w-28`} />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Make
              <input name="make" className={`${inputCls} w-28`} />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Model
              <input name="model" className={`${inputCls} w-32`} />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Year
              <input name="year" type="number" className={`${inputCls} w-20`} />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Plate
              <input name="plate" className={`${inputCls} w-24`} />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              VIN
              <input name="vin" className={`${inputCls} w-44`} />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Notes
              <input name="notes" className={`${inputCls} w-52`} />
            </label>
            <Button type="submit" size="sm">
              Add vehicle
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
