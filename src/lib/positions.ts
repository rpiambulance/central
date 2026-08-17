/**
 * Event positions are stored as free-text keys, lowercase — "cc", "driver",
 * "ees" — both from the legacy import and from what a scheduler types when
 * building an event. Display them properly rather than showing the raw key.
 *
 * Abbreviations stay in capitals (EES, FR-CC); everything else is title case.
 * Anything unrecognised is title-cased word by word, so a position invented
 * next season still reads sensibly.
 */
const LABELS: Record<string, string> = {
  cc: 'Crew Chief',
  crew_chief: 'Crew Chief',
  driver: 'Driver',
  attendant: 'Attendant',
  observer: 'Observer',
  rider: 'Rider',
  ees: 'EES',
  fr_cc: 'FR-CC',
  ds: 'Duty Supervisor',
  duty_sup: 'Duty Supervisor',
  dutysup: 'Duty Supervisor',
};

export function formatPosition(position: string): string {
  const key = position.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const known = LABELS[key];
  if (known) return known;
  return position
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** The positions an event normally has, offered when building one. */
export const COMMON_POSITIONS = [
  'cc',
  'driver',
  'attendant',
  'observer',
  'ees',
];
