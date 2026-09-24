import type { ResetAt } from '../content/types.ts';
import { addDays, PRAYERS, type DayTimes, type Prayer } from './prayer.ts';

const MIN = 60_000;
export const POST_PRAYER_WINDOW = 30 * MIN;
export const SLEEP_AFTER_ISHA = 35 * MIN;

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export type TimesFor = (date: Date) => DayTimes;

/** The most recent prayer at or before `now` (yesterday's Isha before Fajr). */
export function lastPrayer(now: Date, timesFor: TimesFor): { prayer: Prayer; at: Date } {
  const today = timesFor(now);
  for (const p of [...PRAYERS].reverse()) if (today[p] <= now) return { prayer: p, at: today[p] };
  return { prayer: 'isha', at: timesFor(addDays(now, -1)).isha };
}

/**
 * Which period progress belongs to. Progress saved with an older key counts as empty,
 * so collections reset by themselves when their window starts — no timers needed.
 */
export function periodKey(resetAt: ResetAt, now: Date, timesFor: TimesFor): string {
  if (resetAt === 'each-prayer') {
    const { prayer, at } = lastPrayer(now, timesFor);
    return `${dateKey(at)}-${prayer}`;
  }
  const start = timesFor(now)[resetAt];
  return dateKey(now >= start ? now : addDays(now, -1));
}

export type Suggestion =
  | { kind: 'collection'; collectionId: string }
  | { kind: 'tasbih' };

export interface SuggestionResult {
  suggestion: Suggestion;
  /** When the next collection's window starts — shown under a tasbih suggestion. */
  next: { collectionId: string; at: Date } | null;
}

/** Collections that fit `now`, most relevant first (APP_PLAN §5.1). */
export function fittingCollections(now: Date, today: DayTimes): string[] {
  const fits: string[] = [];
  const t = now.getTime();
  if (PRAYERS.some((p) => t >= today[p].getTime() && t < today[p].getTime() + POST_PRAYER_WINDOW)) fits.push('post-prayer');
  const sleepStart = today.isha.getTime() + SLEEP_AFTER_ISHA;
  if (t < today.fajr.getTime() || t >= sleepStart) fits.push('sleep');
  else if (t < today.asr.getTime()) fits.push('morning');
  else fits.push('evening');
  return fits;
}

export function nextCollectionStart(now: Date, today: DayTimes, tomorrow: DayTimes): { collectionId: string; at: Date } {
  const starts = [
    { collectionId: 'morning', at: today.fajr },
    { collectionId: 'evening', at: today.asr },
    { collectionId: 'sleep', at: new Date(today.isha.getTime() + SLEEP_AFTER_ISHA) },
    { collectionId: 'morning', at: tomorrow.fajr },
  ];
  return starts.find((s) => s.at > now)!;
}

/** First fitting collection not yet done this period; if all are done, المسبحة. */
export function suggest(now: Date, timesFor: TimesFor, isDone: (collectionId: string) => boolean): SuggestionResult {
  const today = timesFor(now);
  const pending = fittingCollections(now, today).find((c) => !isDone(c));
  if (pending) return { suggestion: { kind: 'collection', collectionId: pending }, next: null };
  return { suggestion: { kind: 'tasbih' }, next: nextCollectionStart(now, today, timesFor(addDays(now, 1))) };
}
