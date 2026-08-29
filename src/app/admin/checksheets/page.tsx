import Link from 'next/link';
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
import { ErrorBanner } from '@/components/error-banner';
import { PageHeader } from '@/components/page-header';
import { createAsset, createAssetKind, createTemplate } from './actions';

type Template = {
  id: number;
  name: string;
  description: string | null;
  cadence: string;
  active: boolean;
  assetKind: { id: number; name: string } | null;
  items: Array<{ id: number }>;
};
type AssetKind = { id: number; name: string };
type Asset = {
  id: number;
  name: string;
  identifier: string | null;
  kind: AssetKind;
  vehicle: { id: number; name: string } | null;
};
type Vehicle = { id: number; name: string };

const FIELD = 'h-8 rounded-md border border-input bg-background px-2 text-sm';
const CADENCES = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'];

export const dynamic = 'force-dynamic';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Building checksheets needs the checksheets:manage permission.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function AdminChecksheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  let templates: Template[];
  let kinds: AssetKind[];
  let assets: Asset[];
  let vehicles: Vehicle[];
  try {
    [templates, kinds, assets, vehicles] = await Promise.all([
      api<Template[]>('/v1/checksheets?includeInactive=true'),
      api<AssetKind[]>('/v1/checksheets/asset-kinds'),
      api<Asset[]>('/v1/checksheets/assets'),
      api<Vehicle[]>('/v1/vehicles').catch(() => [] as Vehicle[]),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checksheets"
        description="The sheets themselves, and the things they are filled in against."
      />
      <ErrorBanner message={error} />

      <Card>
        <CardHeader>
          <CardTitle>Checksheets</CardTitle>
          <CardDescription>
            Open one to add sections, items and who gets told.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex flex-wrap items-center gap-3 rounded-md border p-2"
              >
                <Link
                  href={`/admin/checksheets/${template.id}`}
                  className="text-sm font-medium underline underline-offset-2"
                >
                  {template.name}
                </Link>
                {template.assetKind ? (
                  <Badge variant="secondary">{template.assetKind.name}</Badge>
                ) : (
                  <Badge variant="outline">standalone</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {template.items.length} item
                  {template.items.length === 1 ? '' : 's'} ·{' '}
                  {template.cadence.toLowerCase()}
                </span>
                {!template.active ? <Badge variant="outline">inactive</Badge> : null}
              </div>
            ))}
            {!templates.length ? (
              <p className="text-sm text-muted-foreground">None yet.</p>
            ) : null}
          </div>

          <form action={createTemplate} className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Name
              <input name="name" required className={`${FIELD} w-56`} />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Description
              <input name="description" className={`${FIELD} w-72`} />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Applies to
              <select name="assetKindId" defaultValue="" className={FIELD}>
                <option value="">Nothing in particular</option>
                {kinds.map((kind) => (
                  <option key={kind.id} value={kind.id}>
                    Each {kind.name.toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              How often
              <select name="cadence" defaultValue="NONE" className={FIELD}>
                {CADENCES.map((cadence) => (
                  <option key={cadence} value={cadence}>
                    {cadence.charAt(0) + cadence.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" size="sm">
              Add checksheet
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Things that get checked</CardTitle>
          <CardDescription>
            Trucks, bags, AEDs, the event trailer. A kind groups them; a
            checksheet applies to a kind and is filled in against one of them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {assets.map((asset) => (
              <Badge key={asset.id} variant="secondary">
                {asset.kind.name}: {asset.name}
                {asset.vehicle ? ' (vehicle)' : ''}
              </Badge>
            ))}
            {!assets.length ? (
              <p className="text-sm text-muted-foreground">Nothing yet.</p>
            ) : null}
          </div>

          <form action={createAssetKind} className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              New kind
              <input
                name="name"
                required
                placeholder="First aid bag"
                className={`${FIELD} w-56`}
              />
            </label>
            <Button type="submit" size="sm" variant="outline">
              Add kind
            </Button>
          </form>

          {kinds.length ? (
            <form action={createAsset} className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Kind
                <select name="kindId" required defaultValue="" className={FIELD}>
                  <option value="" disabled>
                    Select…
                  </option>
                  {kinds.map((kind) => (
                    <option key={kind.id} value={kind.id}>
                      {kind.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Name
                <input
                  name="name"
                  required
                  placeholder="A-1"
                  className={`${FIELD} w-40`}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Identifier
                <input name="identifier" className={`${FIELD} w-40`} />
              </label>
              {vehicles.length ? (
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Same as vehicle
                  <select name="vehicleId" defaultValue="" className={FIELD}>
                    <option value="">Not a vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <Button type="submit" size="sm" variant="outline">
                Add
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
