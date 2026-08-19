import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export type ServiceStatus = {
  inService: boolean;
  reason: string | null;
  changedAt: string | null;
  changedBy: string | null;
};

/**
 * Whether the agency is running, on every page.
 *
 * In service is the ordinary state, so it is stated quietly; out of service
 * is not, and says so in a colour that carries across a room — somebody
 * glancing at a phone in the bay should be able to tell without reading.
 */
export function ServiceStatusBadge({
  status,
  canChange = false,
}: {
  status: ServiceStatus;
  /** Whether the viewer holds service:status; the badge then opens the switch. */
  canChange?: boolean;
}) {
  const badge = status.inService ? (
    <Badge
      variant="outline"
      className="border-emerald-600/40 text-emerald-700 dark:text-emerald-500"
      title={status.changedBy ? `Set by ${status.changedBy}` : undefined}
    >
      In service
    </Badge>
  ) : (
    <Badge
      variant="destructive"
      title={
        [status.reason, status.changedBy && `Set by ${status.changedBy}`]
          .filter(Boolean)
          .join(' · ') || undefined
      }
    >
      Out of service
      {status.reason ? (
        <span className="ml-1 hidden font-normal sm:inline">
          — {status.reason}
        </span>
      ) : null}
    </Badge>
  );

  // The badge is the obvious thing to reach for when the state is wrong, so
  // for whoever may change it, it goes straight to the switch. For everyone
  // else it stays inert rather than leading to a page that refuses them.
  if (!canChange) return badge;
  return (
    <Link
      href="/admin/service-status"
      aria-label="Change the service status"
      className="rounded-md focus-visible:ring-2 focus-visible:ring-ring"
    >
      {badge}
    </Link>
  );
}
