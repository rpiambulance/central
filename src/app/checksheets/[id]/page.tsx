import { notFound } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import {
  CompleteForm,
  type Asset,
  type Item,
  type SealHistory,
  type Section,
} from './complete-form';

type Template = {
  id: number;
  name: string;
  description: string | null;
  assetKind: { id: number; name: string } | null;
  sections: Section[];
  items: Item[];
};

type Blank = {
  template: Template;
  previousRunAt: string | null;
  sections: SealHistory[];
  items: Array<{ itemId: number; expirySlots: number; lastExpiries: string[] }>;
};

export const dynamic = 'force-dynamic';

export default async function CompleteChecksheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ assetId?: string }>;
}) {
  const [{ id }, { assetId }] = await Promise.all([params, searchParams]);
  const templateId = Number(id);
  if (!Number.isInteger(templateId)) notFound();

  let blank: Blank;
  try {
    blank = await api<Blank>(
      `/v1/checksheets/${templateId}/blank${assetId ? `?assetId=${assetId}` : ''}`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const kindId = blank.template.assetKind?.id;
  const assets = kindId
    ? await api<Asset[]>(`/v1/checksheets/assets?kindId=${kindId}`)
    : [];

  const carried = Object.fromEntries(
    blank.items.map((item) => [item.itemId, item.lastExpiries]),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={blank.template.name}
        description={
          blank.template.description ??
          'Work down the sheet. Anything short is raised automatically.'
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">This check</CardTitle>
          <CardDescription>
            {blank.previousRunAt
              ? 'Expiry dates are carried over from the last check — change any that have moved.'
              : 'First time this sheet has been used.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompleteForm
            templateId={templateId}
            sections={blank.template.sections}
            items={blank.template.items}
            assets={assets}
            assetRequired={!!kindId}
            carried={carried}
            seals={blank.sections}
          />
        </CardContent>
      </Card>
    </div>
  );
}
