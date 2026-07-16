import Link from 'next/link';
import { auth, signIn, signOut } from '@/auth';
import { api } from '@/lib/api';
import { AppSidebar } from '@/components/app-sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { TopNavMenus } from '@/components/top-nav-menus';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { filterNavGroups } from '@/lib/nav';

function SignOutButton({ name }: { name: string }) {
  return (
    <form
      action={async () => {
        'use server';
        await signOut();
      }}
    >
      <Button variant="outline" size="sm" type="submit">
        Sign out {name}
      </Button>
    </form>
  );
}

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
        <header className="border-b bg-background">
          <div className="container mx-auto max-w-6xl px-4 h-14 flex items-center gap-4">
            <Link href="/" className="font-heading font-semibold tracking-tight">
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
    );
    if (me?.navLayout) navLayout = me.navLayout;
    permissions = new Set(me?.permissions ?? []);
  } catch {
    // inactive/unlinked members fall back to the default chrome
  }
  const groups = filterNavGroups(permissions);
  const name = session.user.name ?? '';

  if (navLayout === 'topnav') {
    return (
      <div className="min-h-full flex flex-col">
        <header className="border-b bg-background">
          <div className="container mx-auto max-w-6xl px-4 h-14 flex items-center gap-4">
            <Link href="/" className="font-heading font-semibold tracking-tight">
              RPI Ambulance
            </Link>
            <TopNavMenus groups={groups} />
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <SignOutButton name={name} />
            </div>
          </div>
        </header>
        <main className={MAIN}>{children}</main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar groups={groups} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <SignOutButton name={name} />
          </div>
        </header>
        <main className={MAIN}>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
