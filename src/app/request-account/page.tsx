import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ErrorBanner } from '@/components/error-banner';
import { requestAccount } from './actions';
import { SubmitWithCheck } from './submit-button';

const API_URL = process.env.RAMPART_API_URL ?? 'http://localhost:3001';

const FIELD =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';

export const metadata = { title: 'Request an account — RPI Ambulance' };
export const dynamic = 'force-dynamic';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

/**
 * Asking for an account, behind an invite code.
 *
 * The portal has no self-registration, so this is the controlled way in: the
 * code comes in the link — on a poster, in a QR code at an open house — and
 * without a working one there is no form to fill in. The code is checked
 * before the page renders so somebody with a closed code is told plainly
 * rather than typing everything out and being refused at the end.
 */
export default async function RequestAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ 'invite-code'?: string; error?: string }>;
}) {
  const params = await searchParams;
  const code = (params['invite-code'] ?? '').trim();

  const check = code
    ? await fetch(
        `${API_URL}/v1/requests/invites/check?code=${encodeURIComponent(code)}`,
        { cache: 'no-store' },
      )
        .then((res) => res.json() as Promise<{ ok: boolean; problem: string | null }>)
        .catch(() => ({ ok: false, problem: 'We could not check that code just now.' }))
    : null;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Ask for an RPI Ambulance account
        </h1>
        <p className="text-sm text-muted-foreground">
          Tell us who you are and an officer will be in touch.
        </p>
      </div>
      <ErrorBanner message={params.error} />

      {!code ? (
        <Card>
          <CardHeader>
            <CardTitle>You need an invite</CardTitle>
            <CardDescription>
              Accounts here are set up by the agency rather than signed up for.
              Use the link or QR code you were given — it carries the invite
              code with it — or ask whoever pointed you here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : !check?.ok ? (
        <Card>
          <CardHeader>
            <CardTitle>That invite can&apos;t be used</CardTitle>
            <CardDescription>
              {check?.problem ?? 'That invite code is not one of ours.'} Ask
              whoever gave it to you for a current one.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>About you</CardTitle>
            <CardDescription>
              We only need enough to get back to you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={requestAccount} className="grid gap-4">
              <input type="hidden" name="inviteCode" value={code} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name">
                  <input name="firstName" required maxLength={100} className={FIELD} />
                </Field>
                <Field label="Last name">
                  <input name="lastName" required maxLength={100} className={FIELD} />
                </Field>
                <Field label="Email">
                  <input type="email" name="email" required className={FIELD} />
                </Field>
                <Field label="Phone (optional)">
                  <input type="tel" name="phone" maxLength={40} className={FIELD} />
                </Field>
              </div>
              <Field label="Anything we should know (optional)">
                <textarea
                  name="note"
                  rows={3}
                  maxLength={2000}
                  placeholder="Whether you are already certified, when you are free, how you heard about us."
                  className="rounded-md border border-input bg-background p-2 text-sm"
                />
              </Field>
              <SubmitWithCheck />
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
