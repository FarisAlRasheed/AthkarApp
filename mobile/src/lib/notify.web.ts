import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { detectDevice, isStandalone } from '@/lib/pwa';
import { reminders } from '@/lib/reminders';
import { anyReminderOn, useNotify } from '@/store/notify';
import { useSettings } from '@/store/settings';

/**
 * Reminders in the web app (same API as notify.ts). Browsers can't schedule a notification for
 * later, so the app keeps a timer per reminder and shows it through the service worker when it's
 * due. That works while the app is open or recently in the background; a closed web app can only
 * be woken by a push server. iPhone allows notifications only from the home-screen app (iOS 16.4+).
 */

const hasApi = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
export const notificationsSupported = hasApi;
export const notificationsNeedInstall = !hasApi && detectDevice() === 'ios' && !isStandalone();

export async function hasPermission(): Promise<boolean> {
  return hasApi && Notification.permission === 'granted';
}

export async function askPermission(): Promise<boolean> {
  if (!hasApi) return false;
  if (Notification.permission !== 'default') return Notification.permission === 'granted';
  return (await Notification.requestPermission()) === 'granted';
}

// A reminder that wakes up more than this late (the phone froze the app) is dropped, not shown.
const STALE = 10 * 60_000;
// setTimeout overflows past ~24.8 days; reminders reach only 7 days ahead, but stay safe.
const MAX_DELAY = 2 ** 31 - 1;
let timers: ReturnType<typeof setTimeout>[] = [];

async function show(title: string, body: string, url: string) {
  const options = { body, data: { url }, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', lang: 'ar', dir: 'rtl' as const, tag: title };
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg) return reg.showNotification(title, options);
  // No service worker (the dev server): a page notification, which opens its screen on click.
  const n = new Notification(title, options);
  n.onclick = () => {
    window.focus();
    open(url);
  };
}

function open(url: unknown) {
  if (typeof url === 'string' && url !== '/') router.push(url as never);
}

/** Rebuilds every pending reminder from the current settings and location. */
export async function reschedule(): Promise<void> {
  timers.forEach(clearTimeout);
  timers = [];
  if (!anyReminderOn(useNotify.getState()) || !(await hasPermission())) return;
  const now = Date.now();
  for (const r of reminders(new Date(now))) {
    const at = r.at.getTime();
    if (at - now > MAX_DELAY) break;
    timers.push(setTimeout(() => {
      if (Date.now() - at < STALE) show(r.title, r.body, r.url).catch(() => {});
    }, at - now));
  }
}

/** Keeps the timers current and opens the right screen when a reminder is tapped. Mount once. */
export function useNotifications() {
  useEffect(() => {
    if (!hasApi) return;
    reschedule();
    const unsubNotify = useNotify.subscribe(() => reschedule());
    const unsubPlace = useSettings.subscribe((s, prev) => {
      if (s.place !== prev.place) reschedule();
    });
    // Timers sleep with a frozen app; coming back rebuilds them from the clock.
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') reschedule();
    });
    // The service worker posts the tapped reminder's screen (scripts/gen-sw.mjs).
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'open') open(e.data.url);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => {
      unsubNotify();
      unsubPlace();
      app.remove();
      navigator.serviceWorker.removeEventListener('message', onMessage);
      timers.forEach(clearTimeout);
    };
  }, []);
}
