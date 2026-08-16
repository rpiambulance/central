/**
 * Colour per event kind, so a calendar reads at a glance. The four seeded
 * kinds get distinct hues; anything an administrator adds later falls back to
 * a neutral so it is still legible rather than unstyled.
 *
 * Every entry defines both light and dark values — the calendar is dense, and
 * a swatch that only works in one theme is worse than no colour at all.
 */
export interface KindStyle {
  /** Filled block, used in month cells. */
  block: string;
  /** Left rule + tinted background, used in day/week rows. */
  bar: string;
  /** Legend/badge dot. */
  dot: string;
}

const STYLES: Record<string, KindStyle> = {
  Game: {
    block:
      'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100 border-red-300 dark:border-red-800',
    bar: 'border-l-red-500 bg-red-50 dark:bg-red-950/40',
    dot: 'bg-red-500',
  },
  Detail: {
    block:
      'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100 border-blue-300 dark:border-blue-800',
    bar: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/40',
    dot: 'bg-blue-500',
  },
  Meeting: {
    block:
      'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100 border-amber-300 dark:border-amber-800',
    bar: 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/40',
    dot: 'bg-amber-500',
  },
  Social: {
    block:
      'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100 border-emerald-300 dark:border-emerald-800',
    bar: 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
    dot: 'bg-emerald-500',
  },
  // The catch-all kind the legacy import uses for non-game events.
  Event: {
    block:
      'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100 border-violet-300 dark:border-violet-800',
    bar: 'border-l-violet-500 bg-violet-50 dark:bg-violet-950/40',
    dot: 'bg-violet-500',
  },
};

const FALLBACK: KindStyle = {
  block:
    'bg-muted text-foreground dark:bg-muted border-border',
  bar: 'border-l-muted-foreground bg-muted/40',
  dot: 'bg-muted-foreground',
};

export function kindStyle(kindName: string): KindStyle {
  return STYLES[kindName] ?? FALLBACK;
}

/** Kinds with a dedicated colour, for the calendar legend. */
export const COLOURED_KINDS = Object.keys(STYLES);
