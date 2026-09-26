import { addDays, type DayTimes } from './prayer.ts';

/**
 * The living sky (DESIGN_PLAN §2.1). Pure functions: given the time, the prayer times and what the
 * screen wants to show, they return how the sky should look. components/sky draws the result.
 */

export type SkyKey =
  | 'night' | 'predawn' | 'dawn' | 'sunriseDark' | 'sunrise' | 'morning' | 'noon'
  | 'asr' | 'golden' | 'maghrib' | 'dusk';

export interface SkyLook {
  /** Four gradient stops, top to bottom. */
  stops: [string, string, string, string];
  /** Star field visibility 0..1. */
  stars: number;
  /** Cloud visibility 0..1. */
  clouds: number;
  /** Horizon glow strength 0..1, and its colour. */
  glow: number;
  glowColor: string;
}

// Keys where the UI theme flips between light and dark text (sunrise, maghrib) are placed a minute
// either side of the boundary, so text on the sky never sits on a sky of the wrong brightness.
export const SKY: Record<SkyKey, SkyLook> = {
  night: { stops: ['#04050d', '#0a0c1c', '#121531', '#1a1e42'], stars: 1, clouds: 0, glow: 0, glowColor: '#3a3f7a' },
  predawn: { stops: ['#070a1c', '#101a3a', '#1f2f5c', '#3a4a78'], stars: 0.9, clouds: 0, glow: 0.2, glowColor: '#5a78b8' },
  dawn: { stops: ['#0f2645', '#27497a', '#7d8fb4', '#e6b9a6'], stars: 0.45, clouds: 0.1, glow: 0.45, glowColor: '#ffc9a8' },
  sunriseDark: { stops: ['#1c3a66', '#3f5f8f', '#b58a8a', '#f0a878'], stars: 0.1, clouds: 0.2, glow: 0.6, glowColor: '#ffb27a' },
  sunrise: { stops: ['#6fa6dc', '#9cc2e6', '#e8cdb8', '#f7c08e'], stars: 0, clouds: 0.5, glow: 0.5, glowColor: '#ffd2a0' },
  morning: { stops: ['#5fa8e3', '#86bfeb', '#b3d7f2', '#e2f0fa'], stars: 0, clouds: 0.8, glow: 0.1, glowColor: '#ffffff' },
  noon: { stops: ['#62ade9', '#8fc6ef', '#c0ddf5', '#ebf5fc'], stars: 0, clouds: 0.9, glow: 0, glowColor: '#ffffff' },
  asr: { stops: ['#e2a857', '#ecc27f', '#f4d9a8', '#faedd3'], stars: 0, clouds: 0.6, glow: 0.2, glowColor: '#ffe2a8' },
  golden: { stops: ['#e0965e', '#eaae72', '#f3c88c', '#f9e0b0'], stars: 0, clouds: 0.4, glow: 0.45, glowColor: '#ffc58a' },
  maghrib: { stops: ['#2a1f4a', '#5a3068', '#b5566a', '#f0a868'], stars: 0.05, clouds: 0.25, glow: 0.55, glowColor: '#ff9e6e' },
  dusk: { stops: ['#0d1030', '#1f2150', '#3e2f62', '#6a4568'], stars: 0.6, clouds: 0.05, glow: 0.2, glowColor: '#b06a8a' },
};

/** The sky a pinned theme shows (settings → المظهر). */
export const PINNED_SKY = { fajr: 'dawn', morning: 'morning', asr: 'asr', maghrib: 'maghrib', night: 'night' } as const;

const MIN = 60_000;

// ── colour helpers ──────────────────────────────────────────────────────────────────────────

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
export const mixColor = (a: string, b: string, t: number) => {
  const x = rgb(a);
  const y = rgb(b);
  return hex(x.map((v, i) => v + (y[i] - v) * t));
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

export function mixLook(a: SkyLook, b: SkyLook, t: number): SkyLook {
  return {
    stops: a.stops.map((c, i) => mixColor(c, b.stops[i], t)) as SkyLook['stops'],
    stars: lerp(a.stars, b.stars, t),
    clouds: lerp(a.clouds, b.clouds, t),
    glow: lerp(a.glow, b.glow, t),
    glowColor: mixColor(a.glowColor, b.glowColor, t),
  };
}

/** Blend along keyframes [{ at, key }] sorted by `at`; holds the ends. */
function along(frames: { at: number; key: SkyKey }[], x: number): SkyLook {
  if (x <= frames[0].at) return SKY[frames[0].key];
  for (let i = 0; i + 1 < frames.length; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    if (x < b.at) return mixLook(SKY[a.key], SKY[b.key], (x - a.at) / (b.at - a.at));
  }
  return SKY[frames[frames.length - 1].key];
}

// ── clock ───────────────────────────────────────────────────────────────────────────────────

function dayFrames(t: DayTimes): { at: number; key: SkyKey }[] {
  const f = t.fajr.getTime();
  const sr = t.sunrise.getTime();
  const mg = t.maghrib.getTime();
  const is = t.isha.getTime();
  return [
    { at: f - 40 * MIN, key: 'night' },
    { at: f - 15 * MIN, key: 'predawn' },
    { at: f + (sr - f) * 0.5, key: 'dawn' },
    { at: sr - MIN, key: 'sunriseDark' },
    { at: sr + MIN, key: 'sunrise' },
    { at: sr + 60 * MIN, key: 'morning' },
    { at: t.dhuhr.getTime(), key: 'noon' },
    { at: t.asr.getTime() - 20 * MIN, key: 'noon' },
    { at: t.asr.getTime(), key: 'asr' },
    { at: mg - MIN, key: 'golden' },
    { at: mg + MIN, key: 'maghrib' },
    { at: mg + (is - mg) * 0.6, key: 'dusk' },
    { at: is + 30 * MIN, key: 'night' },
  ];
}

/** The sky at `now`, following the prayer times of yesterday, today and tomorrow. */
export function clockLook(now: Date, timesFor: (d: Date) => DayTimes): SkyLook {
  const frames = [-1, 0, 1].flatMap((d) => dayFrames(timesFor(addDays(now, d))));
  return along(frames, now.getTime());
}

/** Where the sun is: 0 at sunrise, 1 at maghrib; null when it is below the horizon. */
export function sunProgress(now: Date, t: DayTimes): number | null {
  const x = now.getTime();
  if (x < t.sunrise.getTime() - 10 * MIN || x > t.maghrib.getTime() + 5 * MIN) return null;
  return clamp((x - t.sunrise.getTime()) / (t.maghrib.getTime() - t.sunrise.getTime()), -0.02, 1.02);
}

// ── moon ────────────────────────────────────────────────────────────────────────────────────

const SYNODIC_DAYS = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

/** The moon's phase from astronomy alone: 0 new → 0.5 full → 1 new. */
export function moonPhase(date: Date): { phase: number; illumination: number; waxing: boolean } {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86_400_000;
  const phase = (((days % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS) / SYNODIC_DAYS;
  return { phase, illumination: (1 - Math.cos(2 * Math.PI * phase)) / 2, waxing: phase < 0.5 };
}

// ── scenes ──────────────────────────────────────────────────────────────────────────────────

export type ThemeOverride = 'fajr' | 'morning' | 'asr' | 'maghrib' | 'night';

export type Scene =
  | { kind: 'clock'; celestial?: boolean; shooting?: boolean }
  /** The reader: the sky tells the collection's story. `band` is the sky band's height in px. */
  | { kind: 'journey'; collectionId: string; progress: number; done: number; total: number; band: number; dim?: number };

export interface SkyState {
  look: SkyLook;
  /** Sun and moon centres in px, or null when not shown. */
  sun: { x: number; y: number } | null;
  moon: { x: number; y: number } | null;
  /** Black overlay 0..1 (the sleep athkar, the opening moment). */
  dim: number;
  /** Show only this many stars, in a fixed order (one per completed thiker in the evening). */
  starLimit: number | null;
  /** Theme the screen's text should use; null = follow the clock. */
  theme: ThemeOverride | null;
  /** The sleep athkar's warm paper. */
  warmPaper: boolean;
  /** Whether ambient motion (twinkle, drifting clouds) may run. The reader stays still. */
  ambient: boolean;
  shooting: boolean;
  /** Faint light rays from the low afternoon sun (Asr until shortly before Maghrib). */
  rays: boolean;
}

export interface SkyInput {
  now: Date;
  timesFor: (d: Date) => DayTimes;
  scene: Scene;
  /** A pinned theme turns the journey off and fixes the sky. */
  pinned: ThemeOverride | null;
  width: number;
  height: number;
  /** Safe-area top inset. */
  top: number;
}

function journey(scene: Extract<Scene, { kind: 'journey' }>, input: SkyInput): Omit<SkyState, 'ambient' | 'shooting' | 'rays'> {
  const { width: w, top } = input;
  const p = clamp(scene.progress);
  const bandY = (f: number) => top + f * scene.band;
  const base = { dim: scene.dim ?? 0, starLimit: null, warmPaper: false, moon: null, sun: null };
  switch (scene.collectionId) {
    case 'morning':
      return {
        ...base,
        look: along([{ at: 0, key: 'sunrise' }, { at: 0.5, key: 'morning' }, { at: 1, key: 'noon' }], p),
        sun: { x: w * lerp(0.84, 0.66, p), y: bandY(lerp(1.05, 0.3, p)) },
        theme: 'morning',
      };
    case 'evening': {
      const look = along([{ at: 0, key: 'asr' }, { at: 0.5, key: 'golden' }, { at: 0.56, key: 'maghrib' }, { at: 1, key: 'dusk' }], p);
      return {
        ...base,
        // The field is fully lit but only one star per completed thiker shows.
        look: { ...look, stars: p >= 0.53 ? 1 : 0 },
        starLimit: scene.done,
        sun: p < 0.62 ? { x: w * lerp(0.36, 0.14, p / 0.62), y: bandY(lerp(0.45, 1.25, p / 0.62)) } : null,
        theme: p < 0.53 ? 'asr' : 'maghrib',
      };
    }
    case 'sleep':
      return {
        ...base,
        look: SKY.night,
        moon: { x: w * 0.2, y: bandY(0.45) },
        dim: Math.max(base.dim, 0.35 * p),
        warmPaper: true,
        theme: 'night',
      };
    default: {
      // After-prayer athkar: the clock's sky, with a horizon glow that grows with progress.
      const clock = clockScene(input);
      return { ...clock, look: { ...clock.look, glow: Math.min(1, clock.look.glow + 0.35 * p) }, dim: base.dim, theme: null };
    }
  }
}

function clockScene(input: SkyInput): Omit<SkyState, 'ambient' | 'shooting' | 'rays'> {
  const { now, timesFor, width: w, height: h, top } = input;
  const today = timesFor(now);
  const look = input.pinned ? SKY[PINNED_SKY[input.pinned]] : clockLook(now, timesFor);
  const showBodies = input.scene.kind !== 'clock' || input.scene.celestial !== false;
  let sun: SkyState['sun'] = null;
  let moon: SkyState['moon'] = null;
  if (showBodies) {
    const f = input.pinned ? (input.pinned === 'morning' ? 0.4 : input.pinned === 'asr' ? 0.8 : null) : sunProgress(now, today);
    // Time flows right to left: the sun rises on the right and sets on the left.
    if (f !== null) sun = { x: w * lerp(0.88, 0.12, f), y: top + h * lerp(0.3, 0.07, Math.sin(Math.PI * clamp(f))) };
    else moon = { x: w * 0.2, y: top + 92 };
  }
  return { look, sun, moon, dim: 0, starLimit: null, theme: null, warmPaper: false };
}

export function skyState(input: SkyInput): SkyState {
  const { scene, now, pinned } = input;
  if (scene.kind === 'journey' && !pinned) {
    return { ...journey(scene, input), ambient: false, shooting: false, rays: false };
  }
  const s = clockScene(input);
  const dim = scene.kind === 'journey' ? scene.dim ?? 0 : 0;
  const t = input.timesFor(now);
  const afternoon = pinned ? pinned === 'asr' : now >= t.asr && now.getTime() < t.maghrib.getTime() - 10 * MIN;
  return {
    ...s,
    dim,
    ambient: scene.kind === 'clock',
    shooting: scene.kind === 'clock' && !!scene.shooting,
    rays: scene.kind === 'clock' && !!s.sun && afternoon,
  };
}
