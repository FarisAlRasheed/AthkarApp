import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { MethodId } from '@/lib/prayer';
import type { ThemeId } from '@/theme';

export interface SavedPlace {
  name: string;
  latitude: number;
  longitude: number;
  method: MethodId;
  countryCode?: string;
  source: 'gps' | 'city';
}

export const FONT_SIZES = [18, 20, 22, 24, 27, 30, 34, 38];

interface SettingsState {
  place: SavedPlace | null;
  bookByCollection: Record<string, string>;
  reciter: string;
  fontSize: number;
  audioRepeat: boolean;
  playbackRate: number;
  playAll: boolean;
  themeMode: 'auto' | ThemeId;
  tasbihSound: boolean;
  set: (patch: Partial<Omit<SettingsState, 'set' | 'setBook'>>) => void;
  setBook: (collectionId: string, bookId: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      place: null,
      bookByCollection: {},
      reciter: 'faris-alrasheed',
      fontSize: 24,
      audioRepeat: true,
      playbackRate: 1,
      playAll: false,
      themeMode: 'auto',
      tasbihSound: false,
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
