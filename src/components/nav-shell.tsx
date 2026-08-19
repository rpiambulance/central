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
export async function NavShell({ children }: { children: React.ReactNode }) {
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
            <TopNavMenus groups={groups} />
            <div className="ml-auto flex items-center gap-2">
              <ServiceStatusBadge status={serviceStatus} />
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
        badges={{ '/inbox': inbox.unread }}
      />
      <SidebarInset>
        <div aria-hidden className="h-1 bg-primary" />
        <header className="flex h-13 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-2">
            <ServiceStatusBadge status={serviceStatus} />
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
