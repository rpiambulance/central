import { api } from './api';

/**
 * The signed-in member's effective permissions, for tailoring affordances —
 * showing a control only to those who can use it. Enforcement is always the
 * API's job; this only decides what is worth rendering.
 */
export async function myPermissions(): Promise<Set<string>> {
  try {
    const me = await api<{ permissions?: string[] }>('/v1/members/me');
    return new Set(me.permissions ?? []);
  } catch {
    // No session, no member record, or the API is unhappy — render as though
    // the member has nothing beyond the basics rather than failing the page.
    return new Set();
  }
}

/** The member's remembered UI preferences, with safe fallbacks. */
export async function myPreferences(): Promise<{
  eventView: string;
  navLayout: string;
}> {
  try {
    const me = await api<{ eventView?: string; navLayout?: string }>(
      '/v1/members/me',
    );
    return {
      eventView: me.eventView ?? 'list',
      navLayout: me.navLayout ?? 'sidebar',
    };
  } catch {
    return { eventView: 'list', navLayout: 'sidebar' };
  }
}

/** Permission governing whether inactive members may be listed at all. */
export const VIEW_INACTIVE = 'members:deactivate';
