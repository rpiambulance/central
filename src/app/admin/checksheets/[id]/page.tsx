import { notFound } from 'next/navigation';
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
import { LayoutEditor } from './layout-editor';
import {
  addItem,
  addSection,
  removeItem,
  removeSection,
  updateItem,
  updateTemplate,
} from '../actions';

type Item = {
  id: number;
  sectionId: number | null;
  order: number;
  label: string;
  kind: 'PRESENCE' | 'PAR';
  parLevel: number | null;
  expiryTracking: 'NONE' | 'SINGLE' | 'PER_UNIT';
};
type Section = { id: number; order: number; heading: string; description: string | null };
type Template = {
  id: number;
  name: string;
  description: string | null;
  cadence: string;
  expiryWarningDays: number | null;
  assetKind: { id: number; name: string } | null;
  notifyRoles: Array<{ id: number; name: string }>;
  sections: Section[];
  items: Item[];
};
type Role = { id: number; name: string };
type AssetKind = { id: number; name: string };

const FIELD = 'h-8 rounded-md border border-input bg-background px-2 text-sm';
const CADENCES = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'];
const TRACKING: Array<{ value: string; label: string }> = [
  { value: 'NONE', label: 'No dates' },
  { value: 'SINGLE', label: 'One date' },
  { value: 'PER_UNIT', label: 'One per unit' },
];

export const dynamic = 'force-dynamic';

export default async function EditChecksheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const templateId = Number(id);
  if (!Number.isInteger(templateId)) notFound();

  let template: Template;
  try {
    template = await api<Template>(`/v1/checksheets/${templateId}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const [roles, kinds] = await Promise.all([
    api<Role[]>('/v1/roles').catch(() => [] as Role[]),
    api<AssetKind[]>('/v1/checksheets/asset-kinds'),
  ]);
  const notified = new Set(template.notifyRoles.map((role) => role.id));

  const itemRow = (item: Item) => (
    <form
      key={item.id}
      // Keyed on the saved values so the form shows what was just saved:
      // React restores an uncontrolled form to its mounted defaults when the
      // action finishes.
      action={updateItem.bind(null, templateId, item.id)}
      className="flex flex-wrap items-end gap-2 rounded-md border p-2"
    >
      <label className="grid gap-1 text-xs text-muted-foreground">
        Item
        <input
          key={item.label}
          name="label"
          defaultValue={item.label}
          className={`${FIELD} w-64`}
        />
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Type
        <select
          key={item.kind}
          name="kind"
          defaultValue={item.kind}
          className={FIELD}
        >
          <option value="PRESENCE">Present / missing</option>
          <option value="PAR">Par level</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Par
        <input
          key={String(item.parLevel)}
          type="number"
          name="parLevel"
          min={1}
          defaultValue={item.parLevel ?? ''}
          className={`${FIELD} w-16`}
        />
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Expiry dates
        <select
          key={item.expiryTracking}
          name="expiryTracking"
          defaultValue={item.expiryTracking}
          className={FIELD}
        >
          {TRACKING.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" size="sm" variant="outline" className="h-8">
        Save
      </Button>
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        className="h-8 text-destructive"
        formAction={removeItem.bind(null, templateId, item.id)}
      >
        Remove
      </Button>
    </form>
  );

  const addItemForm = (sectionId: number | null) => (
    <form
      action={addItem.bind(null, templateId)}
      className="flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="sectionId" value={sectionId ?? ''} />
      <label className="grid gap-1 text-xs text-muted-foreground">
        New item
        <input name="label" required className={`${FIELD} w-64`} />
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Type
        <select name="kind" defaultValue="PRESENCE" className={FIELD}>
          <option value="PRESENCE">Present / missing</option>
          <option value="PAR">Par level</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Par
        <input type="number" name="parLevel" min={1} className={`${FIELD} w-16`} />
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Expiry dates
        <select name="expiryTracking" defaultValue="NONE" className={FIELD}>
          {TRACKING.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" size="sm" className="h-8">
        Add
      </Button>
    </form>
  );

  return (
    <div className="space-y-6">
      <PageHeader title={template.name} description="Sections, items and notifications." />
      <ErrorBanner message={error} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Settings</CardTitle>
          <CardDescription>
            Who is told when this is completed, and how often it should be.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={updateTemplate.bind(null, templateId)}
            className="space-y-3"
          >
            <div className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-xs text-muted-foreground">
                Name
                <input
                  key={template.name}
                  name="name"
                  defaultValue={template.name}
                  className={`${FIELD} w-56`}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Description
                <input
                  key={template.description ?? ''}
                  name="description"
                  defaultValue={template.description ?? ''}
                  className={`${FIELD} w-72`}
                />
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Applies to
                <select
                  key={String(template.assetKind?.id)}
                  name="assetKindId"
                  defaultValue={template.assetKind?.id ?? ''}
                  className={FIELD}
                >
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
                <select
                  key={template.cadence}
                  name="cadence"
                  defaultValue={template.cadence}
                  className={FIELD}
                >
                  {CADENCES.map((cadence) => (
                    <option key={cadence} value={cadence}>
                      {cadence.charAt(0) + cadence.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs text-muted-foreground">
                Warn this many days before an expiry
                <input
                  key={String(template.expiryWarningDays)}
                  type="number"
                  name="expiryWarningDays"
                  min={1}
                  placeholder="30"
                  defaultValue={template.expiryWarningDays ?? ''}
                  className={`${FIELD} w-24`}
                />
              </label>
            </div>
            <fieldset className="grid gap-1">
              <legend className="text-xs text-muted-foreground">
                Tell these roles when a sheet is completed
              </legend>
              <div className="flex flex-wrap gap-3">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      name="notifyRoleIds"
                      value={role.id}
                      defaultChecked={notified.has(role.id)}
                    />
                    {role.name}
                  </label>
                ))}
                {!roles.length ? (
                  <span className="text-sm text-muted-foreground">
                    No roles readable from here.
                  </span>
                ) : null}
              </div>
            </fieldset>
            <Button type="submit" size="sm">
              Save settings
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order</CardTitle>
          <CardDescription>
            Put the sheet in the order the truck is actually walked. Drag a
            row, or use the arrows — and the dropdown moves an item between
            sections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LayoutEditor
            templateId={templateId}
            sections={template.sections}
            items={template.items}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
          <CardDescription>
            Loose items come first, then each section in order.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            {template.items
              .filter((item) => item.sectionId === null)
              .map(itemRow)}
            {addItemForm(null)}
          </div>

          {template.sections.map((section) => (
            <div key={section.id} className="space-y-2 rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">{section.heading}</h2>
                <Badge variant="outline">
                  {template.items.filter((i) => i.sectionId === section.id).length}{' '}
                  items
                </Badge>
                <form
                  action={removeSection.bind(null, templateId, section.id)}
                  className="ml-auto"
                >
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs text-destructive"
                  >
                    remove section
                  </Button>
                </form>
              </div>
              {template.items
                .filter((item) => item.sectionId === section.id)
                .map(itemRow)}
              {addItemForm(section.id)}
            </div>
          ))}

          <form
            action={addSection.bind(null, templateId)}
            className="flex flex-wrap items-end gap-2"
          >
            <label className="grid gap-1 text-xs text-muted-foreground">
              New section
              <input
                name="heading"
                required
                placeholder="Airway"
                className={`${FIELD} w-56`}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Description
              <input name="description" className={`${FIELD} w-72`} />
            </label>
            <Button type="submit" size="sm" variant="outline">
              Add section
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
