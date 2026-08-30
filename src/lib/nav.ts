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
      // No permission: the point of the page is that everyone can find the
      // links. Editing it is what needs one.
      { href: '/resources', label: 'Resources' },
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
      // Only shows a badge when a sweep has actually been held back, but the
      // entry is always here: somebody who has just been told a suspension
      // was blocked should not have to keep the notification to find it
      // again.
      {
        href: '/admin/credentials/suspensions',
        label: 'Pending Suspensions',
        permissions: ['credentials:grant'],
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
      // No permission: anyone may complete a check, and the page is where
      // they start. Building the sheets is the part that needs one.
      { href: '/checksheets', label: 'Checksheets' },
      { href: '/ops/fuel', label: 'Fuel Log' },
      { href: '/admin/radios', label: 'Radios', permissions: ['radios:manage'] },
    ],
  },
  {
    // Setting the place up rather than running it.
    //
    // Deliberately not every page with an officer permission on it: crew
    // assignments, coverage requests, certification verification and the
    // service status are work done daily and belong beside the thing they
    // are about. What lands here is the configuration — the forms, the
    // sheets, the roster itself — which is edited rarely and looked for
    // deliberately, and which would otherwise be scattered.
    label: 'Admin',
    items: [
      {
        href: '/admin/members',
        label: 'Member Roster',
        permissions: ['members:write'],
      },
      {
        href: '/admin/members/unlinked',
        label: 'Unlinked Logins',
        permissions: ['members:write'],
      },
      // "Form Templates", because "Evaluations + Checklists" read as a member
      // page and is not one.
      {
        href: '/admin/evals',
        label: 'Form Templates',
        permissions: ['evals:manage-forms'],
      },
      {
        href: '/admin/checksheets',
        label: 'Manage Checksheets',
        permissions: ['checksheets:manage'],
      },
      // Reachable only from a link on the chores page until now, which is
      // no way to find a page.
      {
        href: '/admin/chores',
        label: 'Manage Chores',
        permissions: ['chores:manage'],
      },
    ],
  },
];

/**
 * Which navigation entry a path belongs to: the longest one that matches.
 *
 * Asking each entry separately lights up every ancestor — "Clear for Calls"
 * at /training/clearances also lit "My Training" at /training, because the
 * path does start with it. Only the most specific match is the page you are
 * on, and computing it here means a new nested entry cannot reintroduce the
 * bug by being added somewhere that does not know to check.
 */
export function activeHref(
  groups: NavGroup[],
  pathname: string,
): string | null {
  let best: string | null = null;
  for (const group of groups) {
    for (const item of group.items) {
      const matches =
        pathname === item.href ||
        (item.href !== '/' && pathname.startsWith(`${item.href}/`));
      if (matches && (best === null || item.href.length > best.length)) {
        best = item.href;
      }
    }
  }
  return best;
}

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
