import Link from 'next/link';
import { summarizeCredentials } from '@/lib/credentials';
import { dayKey, formatDay } from '@/lib/format';
import { auth, devLoginEnabled, signIn } from '@/auth';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type Me = {
  id: number;
  firstName: string;
  lastName: string;
  credentials: Array<{ type: { key: string; name: string }; title: string | null }>;
} | null;

type MyShift = { crewId: number; date: string; position: string };
type UpcomingEvent = { id: number; title: string; startsAt: string };

const CREW_POSITION_LABELS: Record<string, string> = {
  CC: 'Crew Chief',
  DRIVER: 'Driver',
  ATTENDANT: 'Rider',
  OBSERVER: 'Rider',
  DUTY_SUP: 'Duty Supervisor',
};

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string; missing?: string }>;
}) {
  const { denied, missing } = await searchParams;
  const session = await auth();
  if (!session?.user) {
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardHeader>
          <CardTitle>RPI Ambulance Member Portal</CardTitle>
          <CardDescription>Sign in with your RPIA account.</CardDescription>
        </CardHeader>
        {devLoginEnabled ? (
          <CardContent>
            <form
              action={async (formData: FormData) => {
                'use server';
                await signIn('dev-login', {
                  username: formData.get('username'),
                  password: formData.get('password'),
                  redirectTo: '/',
                });
              }}
              className="space-y-2 border-t pt-4"
            >
              <p className="text-xs text-muted-foreground">
                Dev login (local only) — default dev / dev
              </p>
              <input
                name="username"
                placeholder="Username"
                className="w-full rounded-md border bg-transparent px-3 py-1.5 text-sm"
              />
              <input
                name="password"
                type="password"
                placeholder="Password"
                className="w-full rounded-md border bg-transparent px-3 py-1.5 text-sm"
              />
              <Button type="submit" size="sm" className="w-full">
                Sign in without Keycloak redirect
              </Button>
            </form>
          </CardContent>
        ) : null}
      </Card>
    );
  }

  let me: Me = null;
  // The API refuses to talk to two kinds of signed-in person, and they need
  // different things done for them: a member who has been made inactive, and
  // a login with no member record behind it. Both arrive as 403, so the code
  // in the body is what tells them apart — reading only the status told
  // everyone their membership was inactive, including people whose
  // membership was fine and whose account simply was not linked.
  let refusal: 'INACTIVE_MEMBER' | 'NO_MEMBER_RECORD' | null = null;
  try {
    me = await api<Me>('/v1/members/me', { raw: true });
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      const code = (error.body as { code?: string } | null)?.code;
      refusal = code === 'NO_MEMBER_RECORD' ? 'NO_MEMBER_RECORD' : 'INACTIVE_MEMBER';
    } else {
      throw error;
    }
  }

  const bounced = denied
    ? "You don't have access to that page."
    : missing
      ? "That page doesn't exist."
      : null;

  if (refusal === 'NO_MEMBER_RECORD') {
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardHeader>
          <CardTitle>Account not linked</CardTitle>
          <CardDescription>
            Your login worked, but it isn&apos;t linked to a member record yet,
            so there is nothing here to show you. This is not the same as being
            inactive — your membership may be perfectly fine.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Ask an officer to link this account. It helps them to know you are
            signed in as{' '}
            <span className="font-medium text-foreground">
              {session.user.email ?? session.user.name}
            </span>
            , since linking is by email address and a mismatch there is the
            usual cause.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (refusal === 'INACTIVE_MEMBER') {
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardHeader>
          <CardTitle>Membership inactive</CardTitle>
          <CardDescription>
            Your membership is currently inactive. To become active again,
            please contact an officer.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Only for an active member — an inactive one has already returned above.
  const [myShifts, upcomingEvents] = await Promise.all([
    api<MyShift[]>('/v1/crews/mine', { raw: true }).catch(() => []),
    api<UpcomingEvent[]>(
      `/v1/events?from=${encodeURIComponent(new Date().toISOString())}`,
      { raw: true },
    ).catch(() => []),
  ]);
  const nextShift = myShifts[0];
  // The events list carries no per-viewer signup, so this is the next event
  // for the corps rather than specifically yours.
  const nextEvent = upcomingEvents[0];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome{me ? `, ${me.firstName}` : ''}
      </h1>
      {bounced ? (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {bounced}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My credentials</CardTitle>
            <CardDescription>
              {me?.credentials.length
                ? summarizeCredentials(me.credentials)
                    .map((b) => b.tooltip)
                    .join(', ')
                : 'None yet'}
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <Link href="/night-crews" className="hover:underline">
                Night crews
              </Link>
            </CardTitle>
            <CardDescription>
              {nextShift
                ? `Next: ${formatDay(nextShift.date.slice(0, 10))} — ${
                    CREW_POSITION_LABELS[nextShift.position] ?? nextShift.position
                  }`
                : 'No upcoming shifts'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {myShifts.length > 1
              ? `${myShifts.length} shifts scheduled`
              : myShifts.length === 1
                ? '1 shift scheduled'
                : 'Sign up on the night crew schedule.'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <Link href="/events" className="hover:underline">
                Events
              </Link>
            </CardTitle>
            <CardDescription>
              {nextEvent
                ? `Next up: ${nextEvent.title} — ${formatDay(dayKey(nextEvent.startsAt))}`
                : 'Nothing scheduled'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {upcomingEvents.length} upcoming event
            {upcomingEvents.length === 1 ? '' : 's'}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
