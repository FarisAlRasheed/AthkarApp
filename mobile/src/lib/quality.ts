import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSettings } from '@/store/settings';

/**
 * Effect quality (DESIGN_PLAN §6.3). full: everything; lite: no continuous ambient motion and
 * shorter sequences; still: the OS asks for reduced motion, so movement becomes short crossfades.
 */
export type Tier = 'full' | 'lite' | 'still';

/** A first guess for this phone. Phones with ≤ 3 GB of memory, from before 2019, or on Android < 9 get lite. */
export function detectTier(): 'full' | 'lite' {
  if (Platform.OS === 'web') return 'full';
  const memory = Device.totalMemory;
  // A "3 GB" phone reports about 2.8e9 bytes, a "4 GB" one about 3.7e9.
  if (memory != null && memory < 3.3e9) return 'lite';
  const year = Device.deviceYearClass;
  if (year != null && year < 2019) return 'lite';
  if (Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version < 28) return 'lite';
  return 'full';
}

export function useTier(): Tier {
  const reduced = useReducedMotion();
  const quality = useSettings((s) => s.quality);
  const auto = useSettings((s) => s.autoTier);
  if (reduced) return 'still';
  if (quality !== 'auto') return quality;
  return auto ?? 'full';
}

/** Outside React (event handlers, worklet setup). Reduced motion is only known inside components. */
export function currentTier(): 'full' | 'lite' {
  const { quality, autoTier } = useSettings.getState();
  return quality !== 'auto' ? quality : autoTier ?? 'full';
}
