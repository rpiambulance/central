import { notFound } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { formatDateOnly, formatDateTime } from '@/lib/format';
import { prefers12Hour } from '@/lib/me';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { displayName } from '@/lib/name';

type Run = {
  id: number;
  completedAt: string;
  comment: string | null;
  template: {
    name: string;
    sections: Array<{ id: number; heading: string; order: number }>;
    items: Array<{
      id: number;
      sectionId: number | null;
      label: string;
      kind: 'PRESENCE' | 'PAR';
      parLevel: number | null;
    }>;
  };
  asset: { name: string } | null;
  completedBy: { firstName: string; lastName: string } | null;
  entries: Array<{
    itemId: number;
    present: boolean | null;
    countPresent: number | null;
    note: string | null;
    expiries: Array<{ position: number; expiresAt: string }>;
  }>;
};

export const dynamic = 'force-dynamic';

export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let run: Run;
  try {
    run = await api<Run>(`/v1/checksheets/runs/${Number(id)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const hour12 = await prefers12Hour();
  const byItem = new Map(run.entries.map((entry) => [entry.itemId, entry]));

  const line = (item: Run['template']['items'][number]) => {
    const entry = byItem.get(item.id);
    const short =
      item.kind === 'PRESENCE'
        ? entry?.present === false
        : entry?.countPresent !== null &&
          entry?.countPresent !== undefined &&
          entry.countPresent < (item.parLevel ?? 0);
    return (
      <div key={item.id} className="flex flex-wrap items-center gap-3 border-b py-2 text-sm last:border-0">
        <span className="min-w-48 flex-1">{item.label}</span>
        {!entry ? (
          <Badge variant="outline">not looked at</Badge>
        ) : item.kind === 'PRESENCE' ? (
          entry.present === null ? (
            <Badge variant="outline">not looked at</Badge>
          ) : entry.present ? (
            <Badge variant="secondary">present</Badge>
          ) : (
            <Badge variant="destructive">missing</Badge>
          )
        ) : (
          <Badge variant={short ? 'destructive' : 'secondary'}>
            {entry.countPresent} of {item.parLevel}
          </Badge>
        )}
        {entry?.expiries.length ? (
          <span className="text-xs text-muted-foreground">
            expires{' '}
            {entry.expiries
              .map((expiry) => formatDateOnly(expiry.expiresAt))
              .join(', ')}
          </span>
        ) : null}
        {entry?.note ? (
          <span className="text-xs text-muted-foreground">{entry.note}</span>
        ) : null}
      </div>
    );
  };

  const loose = run.template.items.filter((item) => item.sectionId === null);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${run.template.name}${run.asset ? ` — ${run.asset.name}` : ''}`}
        description={`${formatDateTime(run.completedAt, hour12)}${
          run.completedBy
            ? ` · ${displayName(run.completedBy)}`
            : ''
        }`}
      />
      {run.comment ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comments</CardTitle>
            <CardDescription className="whitespace-pre-line">
              {run.comment}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      <Card>
        <CardContent className="pt-6">
          {loose.map(line)}
          {run.template.sections
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((section) => {
              const items = run.template.items.filter(
                (item) => item.sectionId === section.id,
              );
              if (!items.length) return null;
              return (
                <div key={section.id} className="mt-4">
                  <h2 className="mb-1 text-sm font-semibold">{section.heading}</h2>
                  {items.map(line)}
                </div>
              );
            })}
        </CardContent>
      </Card>
    </div>
  );
}
