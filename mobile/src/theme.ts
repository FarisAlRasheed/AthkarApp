import type { DayTimes } from '@/lib/prayer';

export type ThemeId = 'fajr' | 'morning' | 'asr' | 'maghrib' | 'night';

export interface Theme {
  id: ThemeId;
  label: string;
  dark: boolean;
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
  quran: string;
  success: string;
}

export const THEMES: Record<ThemeId, Theme> = {
  fajr: {
    id: 'fajr', label: 'الفجر', dark: true,
    bg: '#14304d', surface: '#1d3f63', surfaceAlt: '#254d76', border: '#2f5a86',
    text: '#eef3fa', muted: '#a9bdd6', accent: '#8db8ea', onAccent: '#0f2440',
    quran: '#8fd6ae', success: '#8fd6ae',
  },
  morning: {
    id: 'morning', label: 'الصباح', dark: false,
    bg: '#f7ecdf', surface: '#fffaf3', surfaceAlt: '#f2e2cf', border: '#ead7bf',
    text: '#2b2118', muted: '#7a6857', accent: '#b8691f', onAccent: '#ffffff',
    quran: '#1e7a4f', success: '#2f8a5b',
  },
  asr: {
    id: 'asr', label: 'العصر', dark: false,
    bg: '#eee1c9', surface: '#faf3e6', surfaceAlt: '#e6d4b4', border: '#dcc6a1',
    text: '#2e2416', muted: '#76654b', accent: '#946326', onAccent: '#ffffff',
    quran: '#1e6f48', success: '#2f7d53',
  },
  maghrib: {
    id: 'maghrib', label: 'المغرب', dark: true,
    bg: '#2f2248', surface: '#3d2e5c', surfaceAlt: '#4a3a6c', border: '#58477c',
    text: '#f6eef4', muted: '#c4b4cf', accent: '#e59a6c', onAccent: '#2a1b3f',
    quran: '#93dcb4', success: '#93dcb4',
  },
  night: {
    id: 'night', label: 'الليل', dark: true,
    bg: '#0b0c1a', surface: '#161830', surfaceAlt: '#1f2241', border: '#2a2e52',
    text: '#eceefa', muted: '#a3a8c9', accent: '#8e9ee0', onAccent: '#0b0c1a',
    quran: '#7ecba1', success: '#7ecba1',
  },
};

export function themeForTime(now: Date, t: DayTimes): ThemeId {
  if (now < t.fajr || now >= t.isha) return 'night';
  if (now < t.sunrise) return 'fajr';
  if (now < t.asr) return 'morning';
  if (now < t.maghrib) return 'asr';
  return 'maghrib';
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };
