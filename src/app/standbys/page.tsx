import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { myPermissions, prefers12Hour } from '@/lib/me';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { OpenStandby, type OpenableEvent } from './open-standby';

type Row = {
  id: number;
  closedAt: string | null;
  event: { id: number; title: string; startsAt: string };
  venue: { id: number; name: string } | null;
  _count: { encounters: number; personnel: number; units: number };
};

type EventKind = { id: number; name: string };

export const dynamic = 'force-dynamic';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>Standbys require additional permissions.</CardDescription>
      </CardHeader>
    </Card>
  );
}

/**
 * Every standby, open ones first.
 *
 * The list is a way in rather than a thing to read: what matters is getting
 * to tonight's board in one tap from a phone at the gate.
 */
export default async function StandbysPage() {
  const [hour12, permissions] = await Promise.all([prefers12Hour(), myPermissions()]);
  const mayManage = permissions.has('standbys:manage');

  let rows: Row[];
  try {
    rows = await api<Row[]>('/v1/standbys');
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return <NoAccess />;
    throw err;
  }

  // Asked of the API rather than worked out here: "future, and without a
  // standby already" is a question the database can answer exactly, and the
  // list above is capped.
  const [openable, kinds] = mayManage
    ? await Promise.all([
        api<OpenableEvent[]>('/v1/standbys/openable', { raw: true }).catch(() => []),
        api<EventKind[]>('/v1/events/kinds', { raw: true }).catch(() => []),
      ])
    : [[], []];

  const open = rows.filter((r) => !r.closedAt);
  const closed = rows.filter((r) => r.closedAt);

  const card = (row: Row) => (
    <Link
      key={row.id}
      href={`/standbys/${row.id}`}
      className="block rounded-md border p-3 hover:bg-muted"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{row.event.title}</span>
        {row.closedAt ? (
          <Badge variant="outline">closed</Badge>
        ) : (
          <Badge>running</Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {formatDateTime(row.event.startsAt, hour12)}
        {row.venue ? ` · ${row.venue.name}` : ''}
        {` · ${row._count.units} units · ${row._count.personnel} on · `}
        {row._count.encounters} encounter{row._count.encounters === 1 ? '' : 's'}
      </p>
    </Link>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event standbys"
        description="What happened at an event medical standby: who worked it, what ran, and who was treated."
      />

      {mayManage ? (
        <OpenStandby
          events={openable}
          kinds={kinds}
          mayCreateEvents={permissions.has('events:create')}
        />
      ) : null}

      {open.length ? (
        <section className="space-y-2">
          <h2 className="text-lg font-medium tracking-tight">Running</h2>
          <div className="grid gap-2">{open.map(card)}</div>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-lg font-medium tracking-tight">Finished</h2>
        {closed.length ? (
          <div className="grid gap-2">{closed.map(card)}</div>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing yet.</p>
        )}
      </section>
    </div>
  );
}
