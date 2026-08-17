/**
 * Plain-date helpers for the calendar views. Everything is computed on
 * YYYY-MM-DD strings in America/New_York so a view never shifts because the
 * viewer is in another timezone, and never drifts across a DST boundary the
 * way date arithmetic on timestamps does.
 */
const TZ = 'America/New_York';

export type CalendarView = 'day' | 'week' | 'month';

export function todayNY(): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: TZ,
  }).format(new Date());
}

/**
 * The crew day currently on duty. A night crew works past midnight, so until
 * 6am the shift that is still running belongs to the previous calendar date —
 * that is the row a member looking at the schedule at 2am cares about.
 */
export function operationalToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    timeZone: TZ,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const dateStr = `${get('year')}-${get('month')}-${get('day')}`;
  // Intl can report hour 24 for midnight; treat it as 0.
  const hour = Number(get('hour')) % 24;
  return hour < 6 ? addDays(dateStr, -1) : dateStr;
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function addMonths(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Clamp to the last day of the target month so 31 Jan + 1 month is 28 Feb,
  // not 3 March.
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(d, lastDay)),
  )
    .toISOString()
    .slice(0, 10);
}

/** Sunday-based week start. */
export function startOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return addDays(dateStr, -date.getUTCDay());
}

export function startOfMonth(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

export function endOfMonth(dateStr: string): string {
  const [y, m] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

export function isSameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/** The date range a view covers, inclusive of both ends. */
export function viewRange(view: CalendarView, dateStr: string): {
  from: string;
  to: string;
} {
  if (view === 'day') return { from: dateStr, to: dateStr };
  if (view === 'week') {
    const start = startOfWeek(dateStr);
    return { from: start, to: addDays(start, 6) };
  }
  // Month views show the whole grid, including the leading and trailing days
  // of the adjacent months that fill the first and last rows.
  const gridStart = startOfWeek(startOfMonth(dateStr));
  return { from: gridStart, to: addDays(gridStart, 41) };
}

/** Step to the previous/next period for the view's navigation. */
export function step(view: CalendarView, dateStr: string, direction: 1 | -1): string {
  if (view === 'day') return addDays(dateStr, direction);
  if (view === 'week') return addDays(dateStr, 7 * direction);
  return addMonths(dateStr, direction);
}

/** Six weeks of dates covering the month that contains `dateStr`. */
export function monthGrid(dateStr: string): string[][] {
  const start = startOfWeek(startOfMonth(dateStr));
  const weeks: string[][] = [];
  for (let w = 0; w < 6; w++) {
    weeks.push(Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  }
  return weeks;
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Day-first, matching the rest of the site: "September 2026",
 * "Week of 16 Aug 2026", "Sunday 16 Aug 2026".
 */
export function longDate(dateStr: string, withWeekday = false): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const found = new Intl.DateTimeFormat('en-US', {
    ...(withWeekday ? { weekday: 'long' as const } : {}),
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).formatToParts(new Date(Date.UTC(y, m - 1, d)));
  const get = (type: string) => found.find((p) => p.type === type)?.value ?? '';
  return [withWeekday ? get('weekday') : '', get('day'), get('month'), get('year')]
    .filter(Boolean)
    .join(' ');
}

export function viewTitle(view: CalendarView, dateStr: string): string {
  if (view === 'month') {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(y, m - 1, d)));
  }
  if (view === 'day') return longDate(dateStr, true);
  return `Week of ${longDate(startOfWeek(dateStr))}`;
}

/**
 * A datetime-local value ("2026-08-16T18:00") as a UTC instant, read as a wall
 * time in New York.
 *
 * `new Date(value)` would read it in the *server's* timezone, and the server
 * runs UTC — so 18:00 was stored as 18:00Z and read back as 14:00 in New York.
 * The offset changes with DST, so it is resolved by trying both and keeping
 * whichever formats back to the time that was typed.
 */
export function nyLocalToIso(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value.trim());
  if (!match) return value;
  const [, dateStr, hh, mm] = match;
  const naive = Date.parse(`${dateStr}T${hh}:${mm}:00Z`);
  for (const offsetMinutes of [240, 300]) {
    const candidate = new Date(naive + offsetMinutes * 60_000);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(candidate);
    const get = (type: string) => parts.find((p) => p.type === type)!.value;
    if (
      `${get('year')}-${get('month')}-${get('day')}` === dateStr &&
      Number(get('hour')) % 24 === Number(hh) &&
      get('minute') === mm
    ) {
      return candidate.toISOString();
    }
  }
  // Inside the spring-forward gap the time does not exist; EST keeps it sane.
  return new Date(naive + 300 * 60_000).toISOString();
}
