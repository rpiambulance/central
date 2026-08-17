import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ErrorBanner } from '@/components/error-banner';
import { submitCoverageRequest } from './actions';
import { EventRows } from './event-rows';
import { SubmitWithCheck } from './submit-button';

export const metadata = {
  title: 'Request EMS coverage — RPI Ambulance',
};

const inputCls =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

export default async function CoverageIntakePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Request EMS coverage from RPI Ambulance
        </h1>
        <p className="text-sm text-muted-foreground">
          Hosting an event that needs EMS standby coverage? Tell us about it
          below. We&apos;ll email you a link to track your request and answer
          any follow-up questions.
        </p>
      </div>
      <ErrorBanner message={error} />
      <Card>
        <CardHeader>
          <CardTitle>Tell us about your event</CardTitle>
          <CardDescription>
            The more detail you can give, the faster we can plan coverage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={submitCoverageRequest} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name">
                <input
                  type="text"
                  name="requesterName"
                  required
                  maxLength={100}
                  className={inputCls}
                />
              </Field>
              <Field label="Organization (optional)">
                <input
                  type="text"
                  name="requesterOrg"
                  maxLength={150}
                  className={inputCls}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  name="requesterEmail"
                  required
                  className={inputCls}
                />
              </Field>
              <Field label="Phone (optional)">
                <input
                  type="tel"
                  name="requesterPhone"
                  maxLength={30}
                  className={inputCls}
                />
              </Field>
            </div>
            <EventRows />
            <SubmitWithCheck />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
