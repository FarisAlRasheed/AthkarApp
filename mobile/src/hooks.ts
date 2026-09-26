import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { collections, getEntries, resolveBookId } from '@/content';
import { addDays, type DayTimes } from '@/lib/prayer';
import { periodKey, type TimesFor } from '@/lib/schedule';
import { timesFor, useClock } from '@/store/clock';
import { useNotify } from '@/store/notify';
import { forPeriod, listKey, listState, readList, useProgress, type ListProgress, type ListState } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { useSky } from '@/store/sky';
import { useTasbih } from '@/store/tasbih';
import { THEMES, WARM_PAPER, type Theme } from '@/theme';

/** The app clock's current minute. Re-renders once a minute, never more. */
export const useMinute = (): Date => useClock((s) => s.now);

export function usePrayerTimes(): { now: Date; today: DayTimes; tomorrow: DayTimes; timesFor: TimesFor; hasPlace: boolean } {
  const now = useMinute();
  const place = useSettings((s) => s.place);
  return useMemo(
    () => ({ now, today: timesFor(now), tomorrow: timesFor(addDays(now, 1)), timesFor, hasPlace: !!place }),
    [now, place],
  );
}

const warmThemes = new Map<string, Theme>();

/** The current theme. Cheap: every Text uses it, so it only selects two primitives from stores. */
export function useTheme(): Theme {
  const clockTheme = useClock((s) => s.themeId);
  const override = useSky((s) => s.theme);
  const warm = useSky((s) => s.warmPaper);
  const theme = THEMES[override ?? clockTheme];
  if (!warm) return theme;
  let t = warmThemes.get(theme.id);
  if (!t) warmThemes.set(theme.id, (t = { ...theme, ...WARM_PAPER }));
  return t;
}

/** Progress state of a collection for the user's chosen book, this period. Not a hook. */
export function collectionState(
  lists: Record<string, ListProgress>,
  collectionId: string,
  preferredBook: string | undefined,
  now: Date,
  times: TimesFor,
): ListState {
  const bookId = resolveBookId(collectionId, preferredBook);
  const key = { collectionId, bookId, periodKey: periodKey(collections[collectionId].resetAt, now, times) };
  return listState(readList(lists, key), getEntries(collectionId, bookId).map((e) => e.num));
}

/** Everything a screen needs about one collection's list for the chosen book, this period. */
export function useCollection(collectionId: string) {
  const now = useMinute();
  const preferred = useSettings((s) => s.bookByCollection[collectionId]);
  const bookId = resolveBookId(collectionId, preferred);
  const entries = useMemo(() => getEntries(collectionId, bookId), [collectionId, bookId]);
  const pk = periodKey(collections[collectionId].resetAt, now, timesFor);
  const key = useMemo(() => ({ collectionId, bookId, periodKey: pk }), [collectionId, bookId, pk]);
  // Select the stored object itself: a selector that builds a new object each call loops forever.
  const raw = useProgress((s) => s.lists[listKey(collectionId, bookId)]);
  const progress = useMemo(() => forPeriod(raw, pk), [raw, pk]);
  const state: ListState = listState(progress, entries.map((e) => e.num));
  const done = entries.filter((e, i) => (progress.counts[i] ?? 0) >= e.num).length;
  return { bookId, entries, key, progress, state, done };
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

const STORES = [useSettings, useProgress, useTasbih, useNotify];
const allHydrated = () => STORES.every((s) => s.persist.hasHydrated());
const onHydrated = (cb: () => void) => {
  const unsubs = STORES.map((s) => s.persist.onFinishHydration(cb));
  return () => unsubs.forEach((u) => u());
};

/** True once every saved store has loaded, so screens never flash empty progress at launch. */
export const useHydrated = (): boolean => useSyncExternalStore(onHydrated, allHydrated, allHydrated);
