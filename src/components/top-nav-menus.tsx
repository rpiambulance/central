'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { NavGroup } from '@/lib/nav';
import { cn } from '@/lib/utils';

/**
 * Everything the navbar holds, in one menu.
 *
 * A row of section dropdowns has nowhere to go on a phone, so below `md` it
 * folds into this. The inbox and the account menu stay outside it — they are
 * wanted often enough that burying them behind another tap is worse.
 */
function MobileNavMenu({
  groups,
  pathname,
}: {
  groups: NavGroup[];
  pathname: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 md:hidden"
            aria-label="Menu"
          />
        }
      >
        <Menu aria-hidden className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[70vh] min-w-56 overflow-y-auto"
      >
        <DropdownMenuItem render={<Link href="/" />}>Dashboard</DropdownMenuItem>
        {groups.map((group) => (
          <div key={group.label}>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">
              {group.label}
            </DropdownMenuLabel>
            {group.items.map((item) => (
              <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
                <span
                  className={cn(
                    (pathname === item.href ||
                      pathname.startsWith(`${item.href}/`)) &&
                      'font-medium',
                  )}
                >
                  {item.label}
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Grouped top-navbar variant: one dropdown per section. */
export function TopNavMenus({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();

  return (
    <>
      <MobileNavMenu groups={groups} pathname={pathname} />
      <nav className="hidden items-center gap-1 text-sm md:flex">
      <Button
        render={<Link href="/" />}
        variant="ghost"
        size="sm"
        className={cn(pathname === '/' && 'bg-accent text-accent-foreground')}
      >
        Dashboard
      </Button>
      {groups.map((group) => {
        const active = group.items.some(
          (item) =>
            pathname === item.href || pathname.startsWith(`${item.href}/`),
        );
        return (
          <DropdownMenu key={group.label}>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(active && 'bg-accent text-accent-foreground')}
                />
              }
            >
              {group.label}
              <span aria-hidden className="ml-0.5 text-muted-foreground">
                ▾
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {group.items.map((item) => (
                <DropdownMenuItem
                  key={item.href}
                  render={<Link href={item.href} />}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          );
        })}
      </nav>
    </>
  );
}
