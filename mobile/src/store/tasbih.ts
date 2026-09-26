import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface TasbihState {
  phraseId: string;
  customText: string;
  /** null = no limit */
  target: number | null;
  count: number;
  /** A running sequence (تسبيح دبر الصلاة) and the step it's on; null when counting one phrase. */
  sequenceId: string | null;
  step: number;
  set: (patch: Partial<Pick<TasbihState, 'phraseId' | 'customText' | 'target' | 'count' | 'sequenceId' | 'step'>>) => void;
  tap: () => number;
}

export const useTasbih = create<TasbihState>()(
  persist(
    (set, get) => ({
      phraseId: 'subhanallah',
      customText: '',
      target: 33,
      count: 0,
      sequenceId: null,
      step: 0,
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
      partialize: ({ phraseId, customText, target, count, sequenceId, step }) => ({ phraseId, customText, target, count, sequenceId, step }),
    },
  ),
);
