/**
 * Single source of truth for navigation. Rendered as sidebar groups (default)
 * or top-navbar dropdowns, per the member's navLayout preference.
 */
export interface NavItem {
  href: string;
  label: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
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
      { href: '/evals', label: 'Evaluations' },
      { href: '/promotions', label: 'Promotions' },
    ],
  },
  {
    label: 'Membership',
    items: [
      { href: '/members', label: 'Member Directory' },
      { href: '/ops/fuel', label: 'Fuel Log' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/admin/schedule', label: 'Schedule' },
      { href: '/admin/availability', label: 'Availability Polls' },
      { href: '/admin/coverage', label: 'Coverage Requests' },
      { href: '/admin/certifications', label: 'Certifications' },
      { href: '/admin/members', label: 'Members' },
      { href: '/admin/roles', label: 'Roles' },
      { href: '/admin/trainings', label: 'Trainings' },
      { href: '/admin/evals', label: 'Eval Templates' },
      { href: '/admin/radios', label: 'Radios' },
      { href: '/admin/tokens', label: 'API Tokens' },
      { href: '/admin/settings', label: 'App Settings' },
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
