import { Easing } from 'react-native-reanimated';
import type { DayTimes } from '@/lib/prayer';

export type ThemeId = 'fajr' | 'morning' | 'asr' | 'maghrib' | 'night';

/**
 * "Living sky": every screen sits on a sky that follows the prayer times (the sky itself is drawn
 * by components/sky; its colours are in lib/sky). A theme holds the colours of everything on it:
 * - text / muted / glass / border are for content drawn directly on the sky.
 * - paper* is the calm, high-contrast card the athkar text is read on.
 * - sheet is the solid background of bottom sheets.
 */
export interface Theme {
  id: ThemeId;
  label: string;
  /** Light status-bar content and light-on-dark text on the sky. */
  dark: boolean;
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
  /** Halos, light motes and the completion glow. */
  glow: string;
  /** Thin geometric ornament lines on the paper. */
  ornament: string;
}

export const THEMES: Record<ThemeId, Theme> = {
  fajr: {
    id: 'fajr', label: 'الفجر', dark: true,
    text: '#f2f5fb', muted: 'rgba(242,245,251,0.74)', glass: 'rgba(255,255,255,0.13)', border: 'rgba(255,255,255,0.26)',
    surfaceAlt: 'rgba(255,255,255,0.12)', sheet: '#1a355a',
    paper: 'rgba(17,38,66,0.92)', paperText: '#eef3fa', paperMuted: '#a9bdd6', paperBorder: 'rgba(255,255,255,0.14)',
    accent: '#8db8ea', onAccent: '#0f2440', quran: '#8fd6ae', success: '#8fd6ae',
    glow: '#ffe9d2', ornament: 'rgba(255,255,255,0.16)',
  },
  morning: {
    id: 'morning', label: 'الصباح', dark: false,
    text: '#0f3558', muted: 'rgba(15,53,88,0.72)', glass: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.85)',
    surfaceAlt: 'rgba(15,53,88,0.07)', sheet: '#f3f8fd',
    paper: 'rgba(255,255,255,0.95)', paperText: '#1c2a36', paperMuted: '#5d7288', paperBorder: '#d6e6f4',
    accent: '#2f7fcf', onAccent: '#ffffff', quran: '#1e7a4f', success: '#2f8a5b',
    glow: '#fff4d6', ornament: 'rgba(47,127,207,0.2)',
  },
  asr: {
    id: 'asr', label: 'العصر', dark: false,
    text: '#4a2f0e', muted: 'rgba(74,47,14,0.74)', glass: 'rgba(255,255,255,0.42)', border: 'rgba(255,255,255,0.75)',
    surfaceAlt: 'rgba(74,47,14,0.07)', sheet: '#fcf4e4',
    paper: 'rgba(255,251,242,0.95)', paperText: '#2e2416', paperMuted: '#7d6647', paperBorder: '#ecd9b6',
    accent: '#a8691e', onAccent: '#ffffff', quran: '#1e6f48', success: '#2f7d53',
    glow: '#fff0c8', ornament: 'rgba(168,105,30,0.22)',
  },
  maghrib: {
    id: 'maghrib', label: 'المغرب', dark: true,
    text: '#ffffff', muted: 'rgba(255,255,255,0.8)', glass: 'rgba(40,20,50,0.32)', border: 'rgba(255,255,255,0.3)',
    surfaceAlt: 'rgba(255,255,255,0.14)', sheet: '#3b2a58',
    paper: 'rgba(255,248,238,0.95)', paperText: '#2a1f2e', paperMuted: '#8a6f73', paperBorder: '#ecd6c8',
    accent: '#c4586a', onAccent: '#ffffff', quran: '#1e7a4f', success: '#2f8a5b',
    glow: '#ffd9bf', ornament: 'rgba(196,88,106,0.2)',
  },
  night: {
    id: 'night', label: 'الليل', dark: true,
    text: '#eceefa', muted: 'rgba(236,238,250,0.72)', glass: 'rgba(255,255,255,0.07)', border: 'rgba(255,255,255,0.16)',
    surfaceAlt: 'rgba(255,255,255,0.08)', sheet: '#161830',
    paper: 'rgba(28,31,62,0.94)', paperText: '#eceefa', paperMuted: '#a3a8c9', paperBorder: 'rgba(255,255,255,0.1)',
    accent: '#8e9ee0', onAccent: '#0b0c1a', quran: '#7ecba1', success: '#7ecba1',
    glow: '#dfe4ff', ornament: 'rgba(255,255,255,0.12)',
  },
};

/** The warm, low-blue paper the sleep athkar are read on. */
export const WARM_PAPER = {
  paper: 'rgba(35,29,22,0.95)', paperText: '#f1e6d2', paperMuted: '#bfae93', paperBorder: 'rgba(241,230,210,0.12)',
  ornament: 'rgba(241,230,210,0.12)',
} as const;

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
  /** King Fahd Complex Uthmanic Hafs — only for Quranic text from content/quran (see scripts/quran-text.mjs). */
  quran: 'KFGQPCHafs',
};

/** Fonts the user can read the athkar in (settings.athkarFont). */
export const ATHKAR_FONTS = {
  naskh: { label: 'نسخ', family: 'NotoNaskhArabic_400Regular' },
  amiri: { label: 'أميري', family: 'Amiri_400Regular' },
  scheherazade: { label: 'شهرزاد', family: 'ScheherazadeNew_400Regular' },
} as const;
export type AthkarFont = keyof typeof ATHKAR_FONTS;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 16, lg: 24, card: 28, pill: 999 };

/**
 * Motion is calm and weighty, never bouncy (DESIGN_PLAN §3). Damping ratios: settle ≈ 0.78
 * (≤2 % overshoot), gentle ≈ 1.19 (none), bead ≈ 0.63 (a small physical click, beads only).
 */
export const motion = {
  duration: { tap: 120, quick: 220, base: 360, calm: 600, slow: 1000, breath: 6000 },
  easing: {
    enter: Easing.out(Easing.cubic),
    exit: Easing.in(Easing.quad),
    drift: Easing.inOut(Easing.sin),
  },
  spring: {
    settle: { damping: 22, stiffness: 220, mass: 0.9 },
    gentle: { damping: 26, stiffness: 120, mass: 1 },
    bead: { damping: 15, stiffness: 280, mass: 0.5 },
  },
  press: { card: 0.98, button: 0.96, icon: 0.92 },
} as const;
