/**
 * Single source of truth for navigation. Rendered as sidebar groups (default)
 * or top-navbar dropdowns, per the member's navLayout preference.
 *
 * `permissions` = show the item when the member holds ANY of the listed
 * permissions (from GET /v1/members/me). Omitted = visible to every member.
 * This is presentation only — the API enforces authorization regardless.
 */
export interface NavItem {
  href: string;
  label: string;
  permissions?: string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'My Portal',
    items: [{ href: '/inbox', label: 'Inbox' }],
  },
  {
    label: 'Scheduling',
    items: [
      { href: '/night-crews', label: 'Night Crews' },
      { href: '/events', label: 'Events' },
      { href: '/availability', label: 'My Availability' },
    ],
  },
  {
    label: 'Training',
    items: [
      { href: '/training', label: 'My Training' },
      { href: '/training/clearances', label: 'Clear for Calls' },
      { href: '/evals', label: 'Evaluations' },
      { href: '/promotions', label: 'Promotions' },
    ],
  },
  {
    label: 'Membership',
    items: [
      { href: '/members', label: 'Member Directory', permissions: ['members:read'] },
      { href: '/ops/fuel', label: 'Fuel Log' },
      { href: '/ops/dispatches', label: 'Dispatch Log', permissions: ['dispatches:read'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/admin/schedule', label: 'Schedule', permissions: ['schedule:crews:assign'] },
      {
        href: '/admin/availability',
        label: 'Availability Polls',
        permissions: ['schedule:crews:manage-defaults'],
      },
      { href: '/admin/coverage', label: 'Coverage Requests', permissions: ['events:create'] },
      { href: '/admin/certifications', label: 'Certifications', permissions: ['certs:verify'] },
      {
        href: '/admin/certifications/expiring',
        label: 'Expiring Certs',
        permissions: ['certs:read-all'],
      },
      { href: '/admin/members', label: 'Members', permissions: ['members:write'] },
      { href: '/admin/trainings', label: 'Trainings', permissions: ['trainings:manage'] },
      { href: '/admin/evals', label: 'Eval Templates', permissions: ['evals:manage-forms'] },
      { href: '/admin/radios', label: 'Radios', permissions: ['radios:manage'] },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/profile', label: 'My Profile' },
      { href: '/settings/calendar', label: 'Calendar Feeds' },
    ],
  },
];

/** Groups visible to a member holding `permissions`; empty groups drop out. */
export function filterNavGroups(permissions: Set<string>): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter(
      (item) =>
        !item.permissions ||
        item.permissions.some((permission) => permissions.has(permission)),
    ),
  })).filter((group) => group.items.length > 0);
}
