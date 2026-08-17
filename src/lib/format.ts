const TZ = 'America/New_York';

/**
 * Dates are written day-first with an abbreviated month and no comma:
 * "16 Aug 2026", or "Sun 16 Aug" where the weekday matters more than the year.
 * Assembled from parts rather than a locale preset so the exact house style
 * survives an ICU update.
 */
function parts(date: Date, timeZone: string, withWeekday: boolean, withYear: boolean) {
  // en-US for the names themselves: en-GB abbreviates September as "Sept".
  const found = new Intl.DateTimeFormat('en-US', {
    ...(withWeekday ? { weekday: 'short' as const } : {}),
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' as const } : {}),
    timeZone,
  }).formatToParts(date);
  const get = (type: string) => found.find((p) => p.type === type)?.value ?? '';
  return [
    withWeekday ? get('weekday') : '',
    get('day'),
    get('month'),
    withYear ? get('year') : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** "Sun 16 Aug" from a YYYY-MM-DD date string (interpreted as a plain date). */
export function formatDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return parts(new Date(Date.UTC(y, m - 1, d)), 'UTC', true, false);
}

/** "16 Aug 2026" from an ISO timestamp, in America/New_York. */
export function formatDate(iso: string): string {
  return parts(new Date(iso), TZ, false, true);
}

/** "Sun 16 Aug" from an ISO timestamp, in America/New_York. */
export function formatDateShort(iso: string): string {
  return parts(new Date(iso), TZ, true, false);
}

/** "7:00 PM" from an ISO timestamp, in America/New_York. */
export function formatTime(iso: string, hour12 = false): string {
  return lowercaseMeridiem(
    new Intl.DateTimeFormat('en-US', {
      // 24-hour time is zero-padded (09:00); a 12-hour clock is not (9:00 am).
      hour: hour12 ? 'numeric' : '2-digit',
      minute: '2-digit',
      hour12,
      timeZone: TZ,
    }),
    new Date(iso),
  );
}

/**
 * Renders through parts so the meridiem can be lowercased without touching
 * anything else — the separator ICU puts before it is a narrow no-break
 * space, not a plain one, so string replacement is unreliable.
 */
function lowercaseMeridiem(formatter: Intl.DateTimeFormat, date: Date): string {
  return formatter
    .formatToParts(date)
    .map((part) =>
      part.type === 'dayPeriod' ? part.value.toLowerCase() : part.value,
    )
    .join('');
}

/**
 * The site shows 24-hour time. Members who prefer a 12-hour clock set it in
 * their profile, and pages pass that through as `hour12`.
 */
export function formatDateTime(iso: string, hour12 = false): string {
  return `${formatDate(iso)}, ${formatTime(iso, hour12)}`;
}

/**
 * An end time, where midnight reads as 24:00 rather than 00:00 — so a shift
 * written 22:00–24:00 cannot be misread as ending before it began. Start
 * times keep 00:00, and a 12-hour clock is left alone, where "12:00 am"
 * already carries the distinction.
 */
export function formatEndTime(iso: string, hour12 = false): string {
  const rendered = formatTime(iso, hour12);
  return !hour12 && rendered === '00:00' ? '24:00' : rendered;
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

/** Credential keys are stored with underscores (P_CC); display with dashes (P-CC). */
export function formatCredKey(key: string): string {
  return key.replace(/_/g, '-');
}
