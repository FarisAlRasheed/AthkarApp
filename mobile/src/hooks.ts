import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { collections, getEntries, resolveBookId } from '@/content';
import { addDays, computeDayTimes, type DayTimes, type Place } from '@/lib/prayer';
import { dateKey, periodKey, type TimesFor } from '@/lib/schedule';
import { forPeriod, listKey, listState, readList, useProgress, type ListProgress, type ListState } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { THEMES, themeForTime, type Theme } from '@/theme';

/** Current time, re-rendering every `intervalMs`. */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// Makkah until the user sets a location, so suggestions and themes still roughly follow the day.
const FALLBACK_PLACE: Place = { latitude: 21.4225, longitude: 39.8262, method: 'UmmAlQura' };

export function usePrayerTimes(now: Date): { today: DayTimes; tomorrow: DayTimes; timesFor: TimesFor; hasPlace: boolean } {
  const place = useSettings((s) => s.place);
  const day = dateKey(now);
  return useMemo(() => {
    const p = place ?? FALLBACK_PLACE;
    const cache = new Map<string, DayTimes>();
    const timesFor: TimesFor = (d) => {
      const k = dateKey(d);
      if (!cache.has(k)) cache.set(k, computeDayTimes(p, new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)));
      return cache.get(k)!;
    };
    return { today: timesFor(now), tomorrow: timesFor(addDays(now, 1)), timesFor, hasPlace: !!place };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place, day]);
}

export function useTheme(): Theme {
  const now = useNow(60_000);
  const mode = useSettings((s) => s.themeMode);
  const { today } = usePrayerTimes(now);
  return THEMES[mode === 'auto' ? themeForTime(now, today) : mode];
}

/** Progress state of a collection for the user's chosen book, this period. Not a hook. */
export function collectionState(
  lists: Record<string, ListProgress>,
  collectionId: string,
  preferredBook: string | undefined,
  now: Date,
  timesFor: TimesFor,
): ListState {
  const bookId = resolveBookId(collectionId, preferredBook);
  const key = { collectionId, bookId, periodKey: periodKey(collections[collectionId].resetAt, now, timesFor) };
  return listState(readList(lists, key), getEntries(collectionId, bookId).map((e) => e.num));
}

/** Everything a screen needs about one collection's list for the chosen book, this period. */
export function useCollection(collectionId: string, now: Date) {
  const preferred = useSettings((s) => s.bookByCollection[collectionId]);
  const bookId = resolveBookId(collectionId, preferred);
  const entries = useMemo(() => getEntries(collectionId, bookId), [collectionId, bookId]);
  const { timesFor } = usePrayerTimes(now);
  const pk = periodKey(collections[collectionId].resetAt, now, timesFor);
  const key = useMemo(() => ({ collectionId, bookId, periodKey: pk }), [collectionId, bookId, pk]);
  // Select the stored object itself: a selector that builds a new object each call loops forever.
  const raw = useProgress((s) => s.lists[listKey(collectionId, bookId)]);
  const progress = useMemo(() => forPeriod(raw, pk), [raw, pk]);
  const state: ListState = listState(progress, entries.map((e) => e.num));
  return { bookId, entries, key, progress, state };
}

/** Back, or home when the screen was opened directly (deep link, notification, reload). */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Keeps the screen on while mounted. Failures (e.g. unsupported browsers) are ignored. */
export function useScreenAwake() {
  useEffect(() => {
    const tag = 'reader';
    activateKeepAwakeAsync(tag).catch(() => {});
    return () => {
      deactivateKeepAwake(tag).catch(() => {});
    };
  }, []);
}
