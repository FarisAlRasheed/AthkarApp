import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useSettings } from '@/store/settings';

/**
 * Every haptic in the app (DESIGN_PLAN §4). Screens say what happened — feel.count(),
 * feel.complete() — never which motor pattern to play. Android uses the system haptic engine
 * (no vibrate permission), falling back to impacts where the OS lacks a constant.
 */

const { ImpactFeedbackStyle: Impact, AndroidHaptics: A } = Haptics;
type Style = Haptics.ImpactFeedbackStyle;
type Pattern = { ios: () => Promise<void>; android: Haptics.AndroidHaptics; androidFallback?: Style };

const impact = (style: Style) => () => Haptics.impactAsync(style);
const later = (ms: number, fn: () => Promise<void>) => new Promise<void>((r) => setTimeout(() => fn().finally(r), ms));

/** Two soft beats, like a heartbeat: the end of something. */
const doubleBeat = () => Haptics.impactAsync(Impact.Medium).then(() => later(110, impact(Impact.Soft)));
const rising = () =>
  Haptics.impactAsync(Impact.Soft)
    .then(() => later(140, impact(Impact.Soft)))
    .then(() => later(140, impact(Impact.Medium)));

export const PATTERNS = {
  count: { ios: impact(Impact.Light), android: A.Keyboard_Tap, androidFallback: Impact.Light },
  milestone: { ios: impact(Impact.Medium), android: A.Context_Click, androidFallback: Impact.Medium },
  complete: { ios: doubleBeat, android: A.Confirm, androidFallback: Impact.Medium },
  collectionComplete: { ios: rising, android: A.Confirm, androidFallback: Impact.Heavy },
  bead: { ios: () => Haptics.selectionAsync(), android: A.Segment_Tick, androidFallback: Impact.Light },
  separator: { ios: impact(Impact.Rigid), android: A.Virtual_Key, androidFallback: Impact.Rigid },
  round: { ios: doubleBeat, android: A.Confirm, androidFallback: Impact.Medium },
  select: { ios: () => Haptics.selectionAsync(), android: A.Toggle_On, androidFallback: Impact.Light },
} satisfies Record<string, Pattern>;

export type Feel = keyof typeof PATTERNS;

function play(p: Pattern) {
  if (Platform.OS === 'ios') return p.ios();
  if (Platform.OS === 'android') {
    return Haptics.performAndroidHapticsAsync(p.android).catch(() =>
      p.androidFallback ? Haptics.impactAsync(p.androidFallback) : undefined,
    );
  }
  return Promise.resolve(); // Web: vibration would only be noise.
}

/** Plays a pattern regardless of the setting (the /lab tuning screen). */
export const playPattern = (name: Feel) => play(PATTERNS[name]).catch(() => {});

export const feel = Object.fromEntries(
  (Object.keys(PATTERNS) as Feel[]).map((name) => [
    name,
    () => {
      if (useSettings.getState().haptics) playPattern(name);
    },
  ]),
) as Record<Feel, () => void>;
