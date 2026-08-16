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

/** "September 2026" / "Week of Sep 8" / "Monday, Sep 8" for the view heading. */
export function viewTitle(view: CalendarView, dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (view === 'month') {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }
  if (view === 'day') {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }
  const start = startOfWeek(dateStr);
  const [sy, sm, sd] = start.split('-').map(Number);
  return `Week of ${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(sy, sm - 1, sd)))}`;
}
