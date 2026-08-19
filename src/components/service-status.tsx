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
export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  if (status.inService) {
    return (
      <Badge
        variant="outline"
        className="border-emerald-600/40 text-emerald-700 dark:text-emerald-500"
        title={status.changedBy ? `Set by ${status.changedBy}` : undefined}
      >
        In service
      </Badge>
    );
  }
  return (
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
}
