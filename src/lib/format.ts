const TZ = 'America/New_York';

/** "Mon, Sep 8" from a YYYY-MM-DD date string (interpreted as a plain date). */
export function formatDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "September 8, 2025" from an ISO timestamp, in America/New_York. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeZone: TZ,
  }).format(new Date(iso));
}

/** "Mon, Sep 8" from an ISO timestamp, in America/New_York. */
export function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: TZ,
  }).format(new Date(iso));
}

/** "7:00 PM" from an ISO timestamp, in America/New_York. */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeStyle: 'short',
    timeZone: TZ,
  }).format(new Date(iso));
}

/** "Sep 8, 2025, 7:00 PM" from an ISO timestamp, in America/New_York. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: TZ,
  }).format(new Date(iso));
}

/** YYYY-MM-DD key for grouping, in America/New_York. */
export function dayKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: TZ,
  }).format(new Date(iso));
}
