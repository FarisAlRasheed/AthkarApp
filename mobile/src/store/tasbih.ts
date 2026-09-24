import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface TasbihState {
  phraseId: string;
  customText: string;
  /** null = no limit */
  target: number | null;
  count: number;
  set: (patch: Partial<Pick<TasbihState, 'phraseId' | 'customText' | 'target' | 'count'>>) => void;
  tap: () => number;
}

export const useTasbih = create<TasbihState>()(
  persist(
    (set, get) => ({
      phraseId: 'subhanallah',
      customText: '',
      target: 33,
      count: 0,
      set: (patch) => set(patch),
      tap: () => {
        const next = get().count + 1;
        set({ count: next });
        return next;
      },
    }),
    {
      name: 'tasbih',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ phraseId, customText, target, count }) => ({ phraseId, customText, target, count }),
    },
  ),
);
