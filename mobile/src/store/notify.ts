import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Prayer } from '@/lib/prayer';

/** Which local reminders are on (APP_PLAN §5.5). All off until the user turns one on. */
interface NotifyState {
  prayers: Record<Prayer, boolean>;
  morning: boolean;
  evening: boolean;
  sleep: boolean;
  /** Minutes after Fajr / Asr for the morning and evening athkar reminders. */
  morningAfter: number;
  eveningAfter: number;
  set: (patch: Partial<Omit<NotifyState, 'set'>>) => void;
}

export const useNotify = create<NotifyState>()(
  persist(
    (set) => ({
      prayers: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
      morning: false,
      evening: false,
      sleep: false,
      morningAfter: 15,
      eveningAfter: 15,
      set: (patch) => set(patch),
    }),
    {
      name: 'notify',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ set: _s, ...data }) => data,
    },
  ),
);

export const anyReminderOn = (s: Pick<NotifyState, 'prayers' | 'morning' | 'evening' | 'sleep'>) =>
  s.morning || s.evening || s.sleep || Object.values(s.prayers).some(Boolean);
