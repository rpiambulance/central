'use client';

import Link from 'next/link';
import { LogOut, User } from 'lucide-react';
import { signOutAction } from '@/app/auth-actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Up to two initials, so the trigger stays the same size for everyone. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : ''))
    .toUpperCase();
}

/**
 * The account menu that sits in the top right of every signed-in page,
 * whichever navigation layout the member has chosen. Only the initials show
 * on narrow screens; the name appears once there is room for it.
 */
export function UserMenu({ name, email }: { name: string; email?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-2 px-1.5 sm:pr-2.5"
            aria-label="Account menu"
          />
        }
      >
        <Avatar className="size-7">
          <AvatarFallback className="text-xs">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate text-sm sm:inline">
          {name}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">{name}</span>
          {email ? (
            <span className="block truncate text-xs text-muted-foreground">
              {email}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/profile" />}>
          <User aria-hidden className="size-4" />
          My profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* The action redirects on the server; the router follows it. */}
        <DropdownMenuItem
          onClick={() => {
            void signOutAction();
          }}
        >
          <LogOut aria-hidden className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
