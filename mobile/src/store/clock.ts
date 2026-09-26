import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { computeDayTimes, type DayTimes, type Place } from '@/lib/prayer';
import { dateKey } from '@/lib/schedule';
import { useSettings } from '@/store/settings';
import { themeForTime, type ThemeId } from '@/theme';

/**
 * One clock for the whole app, ticking on the minute (DESIGN_PLAN §6.2). Components read `now`
 * and the theme from here instead of each running its own timer.
 */
interface ClockState {
  now: Date;
  /** The theme the clock asks for (time of day, or the pinned theme). */
  themeId: ThemeId;
}

export const useClock = create<ClockState>(() => ({ now: new Date(), themeId: 'night' }));

// Makkah until the user sets a location, so suggestions and the sky still roughly follow the day.
const FALLBACK_PLACE: Place = { latitude: 21.4225, longitude: 39.8262, method: 'UmmAlQura' };

const cache = new Map<string, DayTimes>();

/** Prayer times for the day containing `d`, at the saved place. Cached, so it is cheap to call. */
export function timesFor(d: Date): DayTimes {
  const p = useSettings.getState().place ?? FALLBACK_PLACE;
  const k = `${p.latitude},${p.longitude},${p.method}|${dateKey(d)}`;
  let t = cache.get(k);
  if (!t) {
    if (cache.size > 30) cache.clear();
    t = computeDayTimes(p, new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12));
    cache.set(k, t);
  }
  return t;
}

export function tickClock() {
  const now = new Date();
  const mode = useSettings.getState().themeMode;
  useClock.setState({ now, themeId: mode === 'auto' ? themeForTime(now, timesFor(now)) : mode });
}

/** Runs the clock. Mount once, at the root. */
export function useClockDriver() {
  useEffect(() => {
    tickClock();
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        tickClock();
        schedule();
      }, 60_000 - (Date.now() % 60_000) + 30);
    };
    schedule();
    const unsubscribe = useSettings.subscribe((s, prev) => {
      if (s.place !== prev.place || s.themeMode !== prev.themeMode) tickClock();
    });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tickClock();
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
      sub.remove();
    };
  }, []);
}
