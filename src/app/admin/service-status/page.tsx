import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { myPermissions, prefers12Hour } from '@/lib/me';
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
import {
  ServiceStatusBadge,
  type ServiceStatus,
} from '@/components/service-status';
import { setServiceStatus } from './actions';

export const dynamic = 'force-dynamic';

function NoAccess() {
  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardHeader>
        <CardTitle>You don&apos;t have access</CardTitle>
        <CardDescription>
          Putting the agency in or out of service requires additional
          permissions.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function ServiceStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [status, permissions, hour12] = await Promise.all([
    api<ServiceStatus>('/v1/service-status'),
    myPermissions(),
    prefers12Hour(),
  ]);
  if (!permissions.has('service:status')) return <NoAccess />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service status"
        description="Whether the agency is running. Everybody sees this at the top of every page."
      />
      <ErrorBanner message={error} />

      <Card
        className={status.inService ? undefined : 'border-destructive/40'}
      >
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-base">Right now</CardTitle>
            <ServiceStatusBadge status={status} />
          </div>
          <CardDescription>
            {status.changedAt
              ? `Set ${formatDateTime(status.changedAt, hour12)}${
                  status.changedBy ? ` by ${status.changedBy}` : ''
                }.`
              : 'Never changed — the agency has been in service since this was set up.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status.inService ? (
            // Going out of service is the consequential direction, so it asks
            // for a reason and sits behind a disclosure.
            <details>
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Take the agency out of service
              </summary>
              <form
                action={setServiceStatus.bind(null, false)}
                className="mt-3 flex flex-wrap items-end gap-2"
              >
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Why (shown to everybody)
                  <input
                    name="reason"
                    placeholder="No crew available"
                    className="h-9 w-72 rounded-md border border-input bg-background px-2 text-sm"
                  />
                </label>
                <Button type="submit" variant="destructive">
                  Out of service
                </Button>
              </form>
              <p className="mt-2 text-xs text-muted-foreground">
                Chores stop being posted to Slack while this stands. They are
                still recorded as due, so nothing is lost when service
                resumes.
              </p>
            </details>
          ) : (
            <form action={setServiceStatus.bind(null, true)}>
              <Button type="submit">Back in service</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
