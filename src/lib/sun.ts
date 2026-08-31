import * as SunCalc from 'suncalc';

/** Where the station is, which is the only place this is ever asked about. */
export const STATION = { latitude: 42.72927, longitude: -73.67577 };

/** The original's half hour of grace on each end of the day. */
const GRACE_MS = 30 * 60_000;

/**
 * Noon UTC on the New York calendar day the instant falls in.
 *
 * SunCalc answers for the UTC date of whatever instant it is handed, and New
 * York evenings have already rolled over into tomorrow in UTC — so asking it
 * about 20:30 on a June evening returns *the next day's* sunrise and sunset,
 * and the board decides it is night about an hour early. Pinning the query
 * to the local calendar day removes the question.
 */
function localNoon(now: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const at = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(at('year'), at('month') - 1, at('day'), 12));
}

/**
 * Whether the whiteboard should be showing its dark face.
 *
 * A screen bolted to a wall has nobody to set a light or dark preference,
 * so it follows the sun instead. The half hour on each end is the
 * original's and it is right: the bay is dim well before the sun is down,
 * and a board that turns white at first light is the one that hurts to
 * look at at 05:30.
 */
export function isNight(now: Date = new Date(), grace = GRACE_MS): boolean {
  const { sunrise, sunset } = SunCalc.getTimes(
    localNoon(now),
    STATION.latitude,
    STATION.longitude,
  );
  // Inside a polar day or night there is no sunrise to compare against.
  // Troy will never see one, but a screen showing a blank rather than a
  // board because of it would be a silly way to find that out.
  if (!sunrise || !sunset) return false;
  const at = now.getTime();
  return !(at >= sunrise.getTime() + grace && at < sunset.getTime() + grace);
}
