import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

/**
 * The web build as a home-screen app: which phone this is, whether it already runs from the home
 * screen, and Chrome's one-tap install prompt when the browser offers it. Native builds: all off.
 */

export type Device = 'ios' | 'android' | 'desktop';

const web = Platform.OS === 'web' && typeof window !== 'undefined';

export function detectDevice(): Device {
  if (!web) return 'desktop';
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch points give it away.
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

/** Running from the home screen (or installed on a computer), not in a browser tab. */
export function isStandalone(): boolean {
  if (!web) return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** Instagram, WhatsApp, Snapchat… browsers inside apps can't add to the home screen. */
export function isInAppBrowser(): boolean {
  return web && /FBAN|FBAV|Instagram|Line\/|Snapchat|WhatsApp|Twitter|TikTok|musical_ly/i.test(navigator.userAgent);
}

/** iOS browsers other than Safari: since iOS 16.4 they can add to the home screen from their share menu too. */
export function isIOSOtherBrowser(): boolean {
  return web && /CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent);
}

/** Show the «add to home screen» offer: on the web, in a browser tab. */
export const canInstall = web && !isStandalone();

// Chrome (Android and desktop) fires this once it considers the site installable.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
let deferred: InstallEvent | null = web ? ((window as { __installPrompt?: InstallEvent }).__installPrompt ?? null) : null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (web) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    emit();
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The browser's own install dialog is available (one tap instead of the menu steps). */
export const useInstallPrompt = () => useSyncExternalStore(subscribe, () => deferred !== null, () => false);
export const useInstalled = () => useSyncExternalStore(subscribe, () => installed, () => false);

export async function promptInstall(): Promise<boolean> {
  const e = deferred;
  if (!e) return false;
  deferred = null;
  emit();
  await e.prompt();
  return (await e.userChoice).outcome === 'accepted';
}
