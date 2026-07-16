import { Badge } from '@/components/ui/badge';

export const WORKFLOW_LABELS: Record<string, string> = {
  RECEIVED: 'Received',
  DRAFT: 'Draft',
  AVAILABILITY_REQUESTED: 'Checking availability',
  PENDING_APPROVAL: 'Pending approval',
  APPROVED: 'Approved',
  DENIED: 'Denied',
  CANCELLED: 'Cancelled',
};

const VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  RECEIVED: 'secondary',
  DRAFT: 'outline',
  AVAILABILITY_REQUESTED: 'secondary',
  PENDING_APPROVAL: 'secondary',
  APPROVED: 'default',
  DENIED: 'destructive',
  CANCELLED: 'destructive',
};

export function WorkflowBadge({ status }: { status: string }) {
  return (
    <Badge variant={VARIANTS[status] ?? 'outline'}>
      {WORKFLOW_LABELS[status] ?? status}
    </Badge>
  );
}
