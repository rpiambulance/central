'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useSidebar,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { NavGroup } from '@/lib/nav';

export function AppSidebar({
  groups,
  badges,
}: {
  groups: NavGroup[];
  /** Counts shown against a nav item, keyed by href. */
  badges?: Record<string, number>;
}) {
  const pathname = usePathname();
  const { state, isMobile, setOpen, setOpenMobile } = useSidebar();

  // Someone who keeps the sidebar closed opened it to get somewhere, so put
  // it back once they are there. Someone who keeps it open expects it to stay
  // open, which is why this tracks how the sidebar came to be showing rather
  // than simply collapsing on every click.
  const opened = useRef(false);
  const previous = useRef(state);
  useEffect(() => {
    if (previous.current === 'collapsed' && state === 'expanded') {
      opened.current = true;
    } else if (state === 'collapsed') {
      opened.current = false;
    }
    previous.current = state;
  }, [state]);

  const handleNavigate = (href: string) => {
    // Staying on the page is not "going somewhere"; leave the sidebar alone.
    if (href === pathname) return;
    if (isMobile) {
      setOpenMobile(false);
    } else if (opened.current) {
      opened.current = false;
      setOpen(false);
    }
  };

  return (
    <Sidebar>
      <div aria-hidden className="h-1 bg-primary" />
      <SidebarHeader>
        <Link
          href="/"
          className="font-heading font-semibold tracking-tight px-2 py-1.5 text-base text-primary"
        >
          RPI Ambulance
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/" />}
                  isActive={pathname === '/'}
                  onClick={() => handleNavigate('/')}
                >
                  Dashboard
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {groups.map((group, index) => (
          <SidebarGroup key={group.label || index}>
            {/* An unlabelled group sits flush under Dashboard: its items are
                top-level destinations, not a category. */}
            {group.label ? (
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={
                        pathname === item.href ||
                        (item.href !== '/' && pathname.startsWith(`${item.href}/`))
                      }
                      onClick={() => handleNavigate(item.href)}
                    >
                      {item.label}
                      {badges?.[item.href] ? (
                        <span className="ml-auto rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">
                          {badges[item.href]}
                        </span>
                      ) : null}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
