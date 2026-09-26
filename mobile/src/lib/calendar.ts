import { toHijri } from './hijri.ts';
import { addDays } from './prayer.ts';

/**
 * Which special day, if any, the home screen marks (DESIGN_PLAN §8). Like the Islamic day, each one
 * begins at the Maghrib before it — Friday begins on Thursday evening — and ends at its own Maghrib.
 * Only one shows; the order below is the priority. Texts live in content/calendar.json.
 */
export type SpecialDayId =
  | 'eid-fitr' | 'eid-adha' | 'tashreeq' | 'arafah' | 'last-ten' | 'dhul-hijjah' | 'ashura'
  | 'friday' | 'ramadan' | 'white-days' | 'monday' | 'thursday';

export function specialDay(now: Date, maghrib: Date, hijriOffset = 0): SpecialDayId | null {
  const day = now >= maghrib ? addDays(now, 1) : now;
  const h = toHijri(day, hijriOffset);
  if (!h) return null;
  const { month: m, day: d } = h;
  const weekday = day.getDay();
  if (m === 10 && d === 1) return 'eid-fitr';
  if (m === 12 && d === 10) return 'eid-adha';
  if (m === 12 && d >= 11 && d <= 13) return 'tashreeq';
  if (m === 12 && d === 9) return 'arafah';
  if (m === 9 && d >= 21) return 'last-ten';
  if (m === 12 && d <= 8) return 'dhul-hijjah';
  if (m === 1 && (d === 9 || d === 10)) return 'ashura';
  if (weekday === 5) return 'friday';
  if (m === 9) return 'ramadan';
  if (d >= 13 && d <= 15) return 'white-days';
  if (weekday === 1) return 'monday';
  if (weekday === 4) return 'thursday';
  return null;
}
