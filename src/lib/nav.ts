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
    // Unlabelled: these sit at the top alongside Dashboard rather than under
    // a heading. The inbox is the work queue — coverage requests, certs to
    // verify and evals to fill all arrive there as tasks — which is why the
    // admin pages further down can afford to sit lower.
    label: '',
    items: [
      { href: '/inbox', label: 'Inbox' },
      { href: '/members', label: 'Members', permissions: ['members:read'] },
    ],
  },
  {
    label: 'Scheduling',
    items: [
      { href: '/night-crews', label: 'Night Crews' },
      { href: '/events', label: 'Events' },
      { href: '/availability', label: 'My Availability' },
      // Admin, by topic rather than in a separate pile. "Crew Assignments"
      // rather than "Schedule", which collided with Night Crews.
      {
        href: '/admin/schedule',
        label: 'Crew Assignments',
        permissions: ['schedule:crews:assign'],
      },
      {
        href: '/admin/availability',
        label: 'Availability Polls',
        permissions: ['schedule:crews:manage-defaults'],
      },
      {
        href: '/admin/coverage',
        label: 'Coverage Requests',
        permissions: ['events:create'],
      },
    ],
  },
  {
    label: 'Training',
    items: [
      { href: '/training', label: 'My Training' },
      { href: '/evals', label: 'Evaluations' },
      { href: '/checklists', label: 'Checklists' },
      { href: '/training/clearances', label: 'Clear for Calls' },
      { href: '/promotions', label: 'Promotions' },
      { href: '/admin/trainings', label: 'Trainings', permissions: ['trainings:manage'] },
      // One entry: the expiring report is a tab on the certifications page.
      {
        href: '/admin/certifications',
        label: 'Certifications',
        permissions: ['certs:verify', 'certs:read-all'],
      },
      // "Form Templates", because "Evaluations + Checklists" read as a member
      // page and is not one.
      {
        href: '/admin/evals',
        label: 'Form Templates',
        permissions: ['evals:manage-forms'],
      },
    ],
  },
  {
    label: 'Call Ops',
    items: [
      { href: '/call-ops/run-numbers', label: 'Run Numbers' },
      {
        href: '/call-ops/dispatches',
        label: 'Dispatch Log',
        permissions: ['dispatches:read'],
      },
      // An operational state, not configuration — it lives with the rest of
      // what running calls touches.
      {
        href: '/admin/service-status',
        label: 'Service Status',
        permissions: ['service:status'],
      },
    ],
  },
  {
    // Chores, vehicles, radios: the building and its gear.
    label: 'Station',
    items: [
      { href: '/chores', label: 'Chores' },
      { href: '/ops/fuel', label: 'Fuel Log' },
      { href: '/admin/radios', label: 'Radios', permissions: ['radios:manage'] },
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
