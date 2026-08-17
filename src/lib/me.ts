import { api } from './api';

/**
 * The signed-in member's effective permissions, for tailoring affordances —
 * showing a control only to those who can use it. Enforcement is always the
 * API's job; this only decides what is worth rendering.
 */
export async function myPermissions(): Promise<Set<string>> {
  try {
    const me = await api<{ permissions?: string[] }>('/v1/members/me', {
      raw: true,
    });
    return new Set(me.permissions ?? []);
  } catch {
    // No session, no member record, or the API is unhappy — render as though
    // the member has nothing beyond the basics rather than failing the page.
    return new Set();
  }
}

/** The signed-in member's own id, or null if they have no member record. */
export async function myMemberId(): Promise<number | null> {
  try {
    const me = await api<{ id?: number }>('/v1/members/me', { raw: true });
    return me.id ?? null;
  } catch {
    return null;
  }
}

/** The member's remembered UI preferences, with safe fallbacks. */
export async function myPreferences(): Promise<{
  eventView: string;
  navLayout: string;
  timeFormat: string;
}> {
  try {
    const me = await api<{
      eventView?: string;
      navLayout?: string;
      timeFormat?: string;
    }>('/v1/members/me', { raw: true });
    return {
      eventView: me.eventView ?? 'list',
      navLayout: me.navLayout ?? 'sidebar',
      timeFormat: me.timeFormat ?? '24h',
    };
  } catch {
    return { eventView: 'list', navLayout: 'sidebar', timeFormat: '24h' };
  }
}

/**
 * True when this member has asked for a 12-hour clock. The site is 24-hour by
 * default, so anything that cannot resolve the preference stays on 24-hour.
 */
export async function prefers12Hour(): Promise<boolean> {
  return (await myPreferences()).timeFormat === '12h';
}

/** Permission governing whether inactive members may be listed at all. */
export const VIEW_INACTIVE = 'members:deactivate';
