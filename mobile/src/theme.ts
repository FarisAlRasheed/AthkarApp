import type { DayTimes } from '@/lib/prayer';

export type ThemeId = 'fajr' | 'morning' | 'asr' | 'maghrib' | 'night';
export type Celestial = 'dawn' | 'sun-high' | 'sun-low' | 'sunset' | 'moon';

/**
 * "Living sky": every screen sits on a sky that follows the prayer times.
 * - text / muted / glass / border are for content drawn directly on the sky.
 * - paper* is the calm, high-contrast card the athkar text is read on.
 * - sheet is the solid background of bottom sheets.
 */
export interface Theme {
  id: ThemeId;
  label: string;
  /** Light status-bar content and light-on-dark text on the sky. */
  dark: boolean;
  sky: [string, string, ...string[]];
  celestial: Celestial;
  text: string;
  muted: string;
  glass: string;
  border: string;
  surfaceAlt: string;
  sheet: string;
  paper: string;
  paperText: string;
  paperMuted: string;
  paperBorder: string;
  accent: string;
  onAccent: string;
  quran: string;
  success: string;
}

export const THEMES: Record<ThemeId, Theme> = {
  fajr: {
    id: 'fajr', label: 'الفجر', dark: true, celestial: 'dawn',
    sky: ['#0d2442', '#1f4270', '#5a7eaa', '#b9a9c2', '#e8c3b0'],
    text: '#f2f5fb', muted: 'rgba(242,245,251,0.72)', glass: 'rgba(255,255,255,0.13)', border: 'rgba(255,255,255,0.26)',
    surfaceAlt: 'rgba(255,255,255,0.12)', sheet: '#1a355a',
    paper: 'rgba(17,38,66,0.9)', paperText: '#eef3fa', paperMuted: '#a9bdd6', paperBorder: 'rgba(255,255,255,0.14)',
    accent: '#8db8ea', onAccent: '#0f2440', quran: '#8fd6ae', success: '#8fd6ae',
  },
  morning: {
    id: 'morning', label: 'الصباح', dark: false, celestial: 'sun-high',
    sky: ['#5fa8e3', '#86bfeb', '#b3d7f2', '#e2f0fa'],
    text: '#0f3558', muted: 'rgba(15,53,88,0.68)', glass: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.85)',
    surfaceAlt: 'rgba(15,53,88,0.07)', sheet: '#f3f8fd',
    paper: 'rgba(255,255,255,0.94)', paperText: '#1c2a36', paperMuted: '#5d7288', paperBorder: '#d6e6f4',
    accent: '#2f7fcf', onAccent: '#ffffff', quran: '#1e7a4f', success: '#2f8a5b',
  },
  asr: {
    id: 'asr', label: 'العصر', dark: false, celestial: 'sun-low',
    sky: ['#e2a857', '#ecc27f', '#f4d9a8', '#faedd3'],
    text: '#4a2f0e', muted: 'rgba(74,47,14,0.7)', glass: 'rgba(255,255,255,0.42)', border: 'rgba(255,255,255,0.75)',
    surfaceAlt: 'rgba(74,47,14,0.07)', sheet: '#fcf4e4',
    paper: 'rgba(255,251,242,0.95)', paperText: '#2e2416', paperMuted: '#7d6647', paperBorder: '#ecd9b6',
    accent: '#a8691e', onAccent: '#ffffff', quran: '#1e6f48', success: '#2f7d53',
  },
  maghrib: {
    id: 'maghrib', label: 'المغرب', dark: true, celestial: 'sunset',
    sky: ['#2a1f4a', '#4a2f63', '#7a3d6a', '#b5566a', '#e0805e', '#f0a868'],
    text: '#ffffff', muted: 'rgba(255,255,255,0.78)', glass: 'rgba(40,20,50,0.32)', border: 'rgba(255,255,255,0.3)',
    surfaceAlt: 'rgba(255,255,255,0.14)', sheet: '#3b2a58',
    paper: 'rgba(255,248,238,0.95)', paperText: '#2a1f2e', paperMuted: '#8a6f73', paperBorder: '#ecd6c8',
    accent: '#c4586a', onAccent: '#ffffff', quran: '#1e7a4f', success: '#2f8a5b',
  },
  night: {
    id: 'night', label: 'الليل', dark: true, celestial: 'moon',
    sky: ['#04050d', '#0b0c1a', '#141733', '#1c2044'],
    text: '#eceefa', muted: 'rgba(236,238,250,0.7)', glass: 'rgba(255,255,255,0.07)', border: 'rgba(255,255,255,0.16)',
    surfaceAlt: 'rgba(255,255,255,0.08)', sheet: '#161830',
    paper: 'rgba(28,31,62,0.94)', paperText: '#eceefa', paperMuted: '#a3a8c9', paperBorder: 'rgba(255,255,255,0.1)',
    accent: '#8e9ee0', onAccent: '#0b0c1a', quran: '#7ecba1', success: '#7ecba1',
  },
};

export function themeForTime(now: Date, t: DayTimes): ThemeId {
  if (now < t.fajr || now >= t.isha) return 'night';
  if (now < t.sunrise) return 'fajr';
  if (now < t.asr) return 'morning';
  if (now < t.maghrib) return 'asr';
  return 'maghrib';
}

export const fonts = {
  title: 'Amiri_700Bold',
  titleRegular: 'Amiri_400Regular',
  regular: 'IBMPlexSansArabic_400Regular',
  medium: 'IBMPlexSansArabic_500Medium',
  semibold: 'IBMPlexSansArabic_600SemiBold',
  athkar: 'NotoNaskhArabic_400Regular',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };
