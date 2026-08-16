/**
 * Display metadata for the API permission catalog (GET /v1/roles/permissions).
 * Grouped for the token/role UIs; enforcement lives entirely in the API.
 */
export const PERMISSION_INFO: Record<string, string> = {
  'members:read': 'View the member directory and member profiles',
  'members:write': 'Create members and edit member records',
  'members:deactivate': 'Deactivate (and reactivate) members',
  'roles:manage': 'Create/edit roles, assign them to members, and link roles to credentials',
  'settings:write': 'Edit app settings: certification types, event kinds/tiers, credential requirements',
  'certs:read-all': "View any member's certifications and the expiring report",
  'certs:verify': 'Approve or reject submitted certifications and view documents',
  'credentials:grant': 'Directly grant or revoke operational credentials',
  'credentials:appoint': 'Appoint Duty Supervisors (captain power)',
  'evals:write': 'Write and submit evaluations of members',
  'evals:manage-forms': 'Author and revise evaluation form templates',
  'evals:read-all': "View any member's evaluations",
  'promotions:review': 'View promotion requests, checklists, and votes',
  'promotions:vote': 'Vote on promotion requests (Training Committee)',
  'promotions:captain-approve': 'Give final captain approval on promotions',
  'trainings:manage': 'Manage annual trainings, classes, attendance, and completions',
  'schedule:crews:assign': 'Place or remove anyone in any crew slot, any date (including pre-public weeks)',
  'schedule:crews:duty-sup': 'Take the duty supervisor seat on a night crew without holding the DS credential',
  'schedule:crews:manage-defaults': 'Edit the weekly default crew template and run availability polls',
  'schedule:settings': 'Change scheduling rules (signup opening, deadlines, window size)',
  'events:create': 'Create/edit events and run the coverage workflow (incl. requester messaging)',
  'events:assign-others': 'Sign other members up for events or remove them',
  'events:lock': 'Lock and unlock event signups',
  'events:approve': 'Approve or deny coverage events (captain power)',
  'fuel:write': 'Add fuel log entries',
  'radios:manage': 'Manage radio inventory and issue/return radios',
  'vehicles:manage': 'Manage fleet vehicles used by the fuel log',
  'dispatches:ingest': 'Machine ingestion of Herald text-message dispatches',
  'dispatches:read': 'View the dispatch log',
  'tokens:manage': 'Create and revoke API tokens',
  'audit:read': 'Read the audit log',
  'integrations:manage': 'Manage external integrations',
};

const GROUP_LABELS: Array<[prefix: string, label: string]> = [
  ['members:', 'Members'],
  ['roles:', 'Roles'],
  ['schedule:', 'Scheduling'],
  ['events:', 'Events & coverage'],
  ['certs:', 'Certifications'],
  ['credentials:', 'Credentials'],
  ['evals:', 'Evaluations'],
  ['promotions:', 'Promotions'],
  ['trainings:', 'Trainings'],
  ['settings:', 'App settings'],
  ['fuel:', 'Operations'],
  ['radios:', 'Operations'],
  ['vehicles:', 'Operations'],
  ['dispatches:', 'Operations'],
  ['tokens:', 'Administration'],
  ['audit:', 'Administration'],
  ['integrations:', 'Administration'],
];

export function permissionGroup(permission: string): string {
  return (
    GROUP_LABELS.find(([prefix]) => permission.startsWith(prefix))?.[1] ??
    'Other'
  );
}

/** Stable group ordering for display. */
export const GROUP_ORDER = [
  'Members',
  'Roles',
  'Scheduling',
  'Events & coverage',
  'Certifications',
  'Credentials',
  'Evaluations',
  'Promotions',
  'Trainings',
  'App settings',
  'Operations',
  'Administration',
  'Other',
];

export function groupPermissions(
  catalog: string[],
): Array<{ group: string; permissions: string[] }> {
  const byGroup = new Map<string, string[]>();
  for (const permission of catalog) {
    const group = permissionGroup(permission);
    byGroup.set(group, [...(byGroup.get(group) ?? []), permission]);
  }
  return GROUP_ORDER.filter((group) => byGroup.has(group)).map((group) => ({
    group,
    permissions: byGroup.get(group)!.sort(),
  }));
}
