import Link from 'next/link';
import { auth, signIn, signOut } from '@/auth';
import { Button } from '@/components/ui/button';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/night-crews', label: 'Night Crews' },
  { href: '/events', label: 'Events' },
  { href: '/members', label: 'Members' },
  { href: '/training', label: 'My Training' },
];

export async function SiteNav() {
  const session = await auth();

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto max-w-6xl px-4 h-14 flex items-center gap-6">
        <Link href="/" className="font-semibold tracking-tight">
          RPI Ambulance
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          {session?.user ? (
            <form
              action={async () => {
                'use server';
                await signOut();
              }}
            >
              <Button variant="outline" size="sm" type="submit">
                Sign out {session.user.name ?? ''}
              </Button>
            </form>
          ) : (
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
          )}
        </div>
      </div>
    </header>
  );
}
