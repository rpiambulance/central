import { notFound } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { prefers12Hour } from '@/lib/me';
import { PageHeader } from '@/components/page-header';
import { QueueStatus } from '../queue-status';
import { Board } from './board';
import type { Config, Standby, TimelineEntry } from './types';

export const dynamic = 'force-dynamic';

/**
 * One standby, as it is being worked.
 *
 * Read on the server so a phone at the gate gets the board in one round
 * trip; everything after that is the client talking through the queue.
 */
export default async function StandbyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const standbyId = Number(id);
  if (!Number.isInteger(standbyId)) notFound();

  let standby: Standby;
  try {
    standby = await api<Standby>(`/v1/standbys/${standbyId}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const [config, timeline, hour12] = await Promise.all([
    api<Config>('/v1/standbys/config/all', { raw: true }).catch(() => ({
      places: [],
      designators: [],
      hospitals: [],
      members: [],
    })),
    // The board is worth showing without it; a standby with no record of
    // what happened is still a standby being worked.
    api<TimelineEntry[]>(`/v1/standbys/${standbyId}/timeline`, {
      raw: true,
    }).catch(() => []),
    prefers12Hour(),
  ]);

  return (
    <div className="space-y-4">
      <QueueStatus />
      <PageHeader
        title={standby.event.title}
        description={
          standby.closedAt
            ? 'This standby is closed. Encounters can still be corrected.'
            : 'Running now.'
        }
      />
      <Board
        initial={standby}
        config={config}
        timeline={timeline}
        hour12={hour12}
      />
    </div>
  );
}
