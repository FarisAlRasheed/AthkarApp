import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { addDays, PRAYER_LABELS, PRAYERS } from '@/lib/prayer';
import { SLEEP_AFTER_ISHA } from '@/lib/schedule';
import { timesFor } from '@/store/clock';
import { anyReminderOn, useNotify } from '@/store/notify';
import { useSettings } from '@/store/settings';

/**
 * Local reminders only — no server (APP_PLAN §5.5). iOS keeps at most 64 pending notifications, so
 * a rolling 7 days is scheduled (5 prayers × 7 + 3 reminders × 7 = 56) and rebuilt whenever the
 * app opens or a setting or the location changes.
 */

export const notificationsSupported = Platform.OS === 'ios' || Platform.OS === 'android';
const CHANNEL = 'reminders';
const DAYS = 7;

export async function hasPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Asks the system once, after our own explanation (the notifications screen). */
export async function askPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'التذكير', importance: Notifications.AndroidImportance.DEFAULT });
  }
  return (await Notifications.requestPermissionsAsync()).granted;
}

type Reminder = { at: Date; title: string; body: string; url: string };

function reminders(from: Date): Reminder[] {
  const n = useNotify.getState();
  const out: Reminder[] = [];
  for (let d = 0; d < DAYS; d++) {
    const t = timesFor(addDays(from, d));
    for (const p of PRAYERS) {
      if (n.prayers[p]) out.push({ at: t[p], title: `صلاة ${PRAYER_LABELS[p]}`, body: 'حان وقت الصلاة', url: '/' });
    }
    if (n.morning) out.push({ at: new Date(t.fajr.getTime() + n.morningAfter * 60_000), title: 'أذكار الصباح', body: 'أصبحنا وأصبح الملك لله — حان وقت أذكار الصباح', url: '/read/morning' });
    if (n.evening) out.push({ at: new Date(t.asr.getTime() + n.eveningAfter * 60_000), title: 'أذكار المساء', body: 'حان وقت أذكار المساء', url: '/read/evening' });
    if (n.sleep) out.push({ at: new Date(t.isha.getTime() + SLEEP_AFTER_ISHA), title: 'أذكار النوم', body: 'اختم يومك بذكر الله', url: '/read/sleep' });
  }
  return out.filter((r) => r.at > from).sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 60);
}

let running: Promise<void> | null = null;

/** Rebuilds every pending reminder from the current settings and location. */
export function reschedule(): Promise<void> {
  if (!notificationsSupported) return Promise.resolve();
  const run = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!anyReminderOn(useNotify.getState()) || !(await hasPermission())) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'التذكير', importance: Notifications.AndroidImportance.DEFAULT });
    }
    for (const r of reminders(new Date())) {
      await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body, data: { url: r.url }, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL },
      });
    }
  };
  // One at a time: a second request waits for the first, then runs with the newest settings.
  running = (running ?? Promise.resolve()).then(run, run).catch(() => {});
  return running;
}

/**
 * Keeps reminders current (on open, and when reminders or the location change) and opens the
 * right screen when one is tapped. Mount once, at the root.
 */
export function useNotifications() {
  useEffect(() => {
    if (!notificationsSupported) return;
    reschedule();
    const unsubNotify = useNotify.subscribe(() => reschedule());
    const unsubPlace = useSettings.subscribe((s, prev) => {
      if (s.place !== prev.place) reschedule();
    });
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') reschedule();
    });
    const open = (n: Notifications.Notification) => {
      const url = n.request.content.data?.url;
      if (typeof url === 'string' && url !== '/') router.push(url as never);
    };
    const last = Notifications.getLastNotificationResponse();
    if (last?.notification) open(last.notification);
    const tap = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification));
    return () => {
      unsubNotify();
      unsubPlace();
      app.remove();
      tap.remove();
    };
  }, []);
}
