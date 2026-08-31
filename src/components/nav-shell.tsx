import { headers } from 'next/headers';
import Link from 'next/link';
import { auth, signIn } from '@/auth';
import { api } from '@/lib/api';
import { AppSidebar } from '@/components/app-sidebar';
import { InboxButton } from '@/components/inbox-button';
import {
  ServiceStatusBadge,
  type ServiceStatus,
} from '@/components/service-status';
import { UserMenu } from '@/components/user-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { TopNavMenus } from '@/components/top-nav-menus';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { filterNavGroups } from '@/lib/nav';
import { recordPageView } from '@/lib/page-view';

function SignInButton() {
  return (
    <form
      action={async () => {
        'use server';
        await signIn('keycloak');
      }}
    >
      <Button size="sm" type="submit">
        Sign in
      </Button>
    </form>
  );
}

const MAIN = 'flex-1 container mx-auto max-w-6xl px-4 py-6';

/**
 * Chooses the navigation chrome per the member's saved preference
 * (Member.navLayout): sidebar (default) or a grouped top navbar.
 * Unauthenticated visitors (incl. the public /coverage pages) get a
 * minimal header.
 */
/** Pages that fill the screen on their own. */
const CHROMELESS = new Set(['/headsup']);

export async function NavShell({ children }: { children: React.ReactNode }) {
  // A wall display gets the page and nothing else — no sidebar, no header,
  // no sign-in button for a television to ignore. The path arrives as a
  // header because a server component cannot see its own URL.
  const pathname = (await headers()).get('x-pathname');
  if (pathname && CHROMELESS.has(pathname)) return <>{children}</>;

  const session = await auth();

  if (!session?.user) {
    return (
      <div className="min-h-full flex flex-col">
        <div aria-hidden className="h-1 bg-primary" />
        <header className="border-b bg-background">
          <div className="container mx-auto max-w-6xl px-4 h-14 flex items-center gap-4">
            <Link
              href="/"
              className="font-heading font-semibold tracking-tight text-primary"
            >
              RPI Ambulance
            </Link>
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <SignInButton />
            </div>
          </div>
        </header>
        <main className={MAIN}>{children}</main>
      </div>
    );
  }

  let navLayout = 'sidebar';
  let permissions = new Set<string>();
  try {
    const me = await api<{ navLayout?: string; permissions?: string[] }>(
      '/v1/members/me',
      { raw: true },
    );
    if (me?.navLayout) navLayout = me.navLayout;
    permissions = new Set(me?.permissions ?? []);
  } catch {
    // inactive/unlinked members fall back to the default chrome
  }
  const groups = filterNavGroups(permissions);
  // Every signed-in page renders through here, so this is the one place a
  // page view can be recorded without touching each page.
  await recordPageView();
  // Outstanding work, shown against the Inbox link.
  const inbox = await api<{ unread: number; tasks: number }>(
    '/v1/inbox/summary',
    { raw: true },
  ).catch(() => ({ unread: 0, tasks: 0 }));
  // Certifications waiting on somebody, shown against the Certifications
  // link — but only for those who could act on them, and only asked for at
  // all when they hold the permission, so an ordinary member's every page
  // load does not carry a 403.
  const certsPending = permissions.has('certs:verify')
    ? await api<{ count: number }>('/v1/certifications/pending/count', {
        raw: true,
      })
        .then((result) => result.count)
        .catch(() => 0)
    : 0;
  // Checks past their schedule, shown against the Checksheets link. Everyone
  // can complete one, so everyone gets the count.
  const checksOverdue = await api<Array<{ overdue: boolean }>>(
    '/v1/checksheets/due',
    { raw: true },
  )
    .then((rows) => rows.filter((row) => row.overdue).length)
    .catch(() => 0);
  // A sweep the nightly check refused to apply. Read from what that check
  // recorded, not by planning a fresh one — this renders on every page.
  const heldSuspensions = permissions.has('credentials:grant')
    ? await api<{ held: boolean; count: number }>(
        '/v1/certifications/suspensions/held',
        { raw: true },
      )
        .then((result) => (result.held ? result.count : 0))
        .catch(() => 0)
    : 0;
  // People waiting to be let in, or for a locked field to be changed. Both
  // kinds land on one page, so they are one number — and asked for only by
  // those who could act on them, like the counts above.
  const requestsPending = permissions.has('members:write')
    ? await api<{ count: number }>('/v1/requests/pending/count', { raw: true })
        .then((result) => result.count)
        .catch(() => 0)
    : 0;
  // Unreadable status must not claim the agency is down, so it falls back to
  // in service — the ordinary state, and the one that misleads nobody.
  const serviceStatus = await api<ServiceStatus>('/v1/service-status', {
    raw: true,
  }).catch(() => ({
    inService: true,
    reason: null,
    changedAt: null,
    changedBy: null,
  }));
  const name = session.user.name ?? '';
  const email = session.user.email ?? undefined;

  if (navLayout === 'topnav') {
    return (
      <div className="min-h-full flex flex-col">
        <div aria-hidden className="h-1 bg-primary" />
        <header className="border-b bg-background">
          <div className="container mx-auto max-w-6xl px-4 h-14 flex items-center gap-4">
            <Link
              href="/"
              className="font-heading font-semibold tracking-tight text-primary"
            >
              RPI Ambulance
            </Link>
            <TopNavMenus
              groups={groups}
              badges={{
                '/inbox': inbox.unread,
                '/admin/certifications': certsPending,
                '/checksheets': checksOverdue,
                '/admin/credentials/suspensions': heldSuspensions,
                '/admin/members/requests': requestsPending,
              }}
            />
            <div className="ml-auto flex items-center gap-2">
              <ServiceStatusBadge
              status={serviceStatus}
              canChange={permissions.has('service:status')}
            />
              <ThemeToggle />
              <InboxButton unread={inbox.unread} tasks={inbox.tasks} />
              <UserMenu name={name} email={email} />
            </div>
          </div>
        </header>
        <main className={MAIN}>{children}</main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar
        groups={groups}
        badges={{
          '/inbox': inbox.unread,
          '/admin/certifications': certsPending,
          '/checksheets': checksOverdue,
          '/admin/credentials/suspensions': heldSuspensions,
          '/admin/members/requests': requestsPending,
        }}
      />
      <SidebarInset>
        <div aria-hidden className="h-1 bg-primary" />
        <header className="flex h-13 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-2">
            <ServiceStatusBadge
              status={serviceStatus}
              canChange={permissions.has('service:status')}
            />
            <ThemeToggle />
            <InboxButton unread={inbox.unread} tasks={inbox.tasks} />
            <UserMenu name={name} email={email} />
          </div>
        </header>
        <main className={MAIN}>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
