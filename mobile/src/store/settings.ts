import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { MethodId } from '@/lib/prayer';
import type { AthkarFont, ThemeId } from '@/theme';

export interface SavedPlace {
  name: string;
  latitude: number;
  longitude: number;
  method: MethodId;
  countryCode?: string;
  source: 'gps' | 'city';
}

export const FONT_SIZES = [18, 20, 22, 24, 27, 30, 34, 38];

/** «جودة المؤثرات»: auto follows the device (DESIGN_PLAN §6.3). */
export type QualitySetting = 'auto' | 'full' | 'lite';

/** The misbaha's beads (DESIGN_PLAN §7.4). */
export const BEAD_MATERIALS = {
  amber: 'كهرمان',
  wood: 'خشب',
  pearl: 'لؤلؤ',
  onyx: 'يسر أسود',
  turquoise: 'فيروز',
} as const;
export type BeadMaterial = keyof typeof BEAD_MATERIALS;

interface SettingsState {
  place: SavedPlace | null;
  bookByCollection: Record<string, string>;
  reciter: string;
  fontSize: number;
  athkarFont: AthkarFont;
  audioRepeat: boolean;
  playbackRate: number;
  playAll: boolean;
  themeMode: 'auto' | ThemeId;
  tasbihSound: boolean;
  /** A soft tap sound on each count in the reader. */
  countSound: boolean;
  /** Natural ambience in the reader and tasbih: follows the sky, a fixed one, or none. */
  ambient: 'off' | 'auto' | 'rain';
  soundVolume: 'low' | 'mid' | 'high';
  haptics: boolean;
  quality: QualitySetting;
  /** What auto means on this phone: detected at first launch, lowered if frames drop. */
  autoTier: 'full' | 'lite' | null;
  /** Shifts the Hijri date for places that follow local moon sighting (−2 … +2). */
  hijriOffset: number;
  beadMaterial: BeadMaterial;
  onboarded: boolean;
  set: (patch: Partial<Omit<SettingsState, 'set' | 'setBook'>>) => void;
  setBook: (collectionId: string, bookId: string) => void;
}

// New fields need only a default here: persisted state is merged over these defaults.
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      place: null,
      bookByCollection: {},
      reciter: 'faris-alrasheed',
      fontSize: 24,
      athkarFont: 'naskh',
      audioRepeat: true,
      playbackRate: 1,
      playAll: false,
      themeMode: 'auto',
      tasbihSound: false,
      countSound: false,
      ambient: 'off',
      soundVolume: 'mid',
      haptics: true,
      quality: 'auto',
      autoTier: null,
      hijriOffset: 0,
      beadMaterial: 'amber',
      onboarded: false,
      set: (patch) => set(patch),
      setBook: (collectionId, bookId) =>
        set((s) => ({ bookByCollection: { ...s.bookByCollection, [collectionId]: bookId } })),
    }),
    {
      name: 'settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ set: _s, setBook: _b, ...data }) => data,
    },
  ),
);
