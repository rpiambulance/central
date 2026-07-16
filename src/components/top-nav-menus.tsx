'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { NAV_GROUPS } from '@/lib/nav';
import { cn } from '@/lib/utils';

/** Grouped top-navbar variant: one dropdown per section. */
export function TopNavMenus() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 text-sm">
      <Button
        render={<Link href="/" />}
        variant="ghost"
        size="sm"
        className={cn(pathname === '/' && 'bg-accent text-accent-foreground')}
      >
        Dashboard
      </Button>
      {NAV_GROUPS.map((group) => {
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
  );
}
