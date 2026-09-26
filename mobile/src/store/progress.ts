import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Counts are stored by position in the book's list, not by thiker id: the same thiker can
 * appear twice in one list (tahleel ×10 and ×100). Progress whose periodKey is not the current
 * one is treated as empty — that is how collections reset (see lib/schedule periodKey).
 */
export interface ListProgress {
  periodKey: string;
  index: number;
  counts: number[];
}

type Key = { collectionId: string; bookId: string; periodKey: string };

interface ProgressState {
  lists: Record<string, ListProgress>;
  /** Day (dateKey) each collection's opening moment was last shown — it shows once a day. */
  openedOn: Record<string, string>;
  markOpened: (collectionId: string, day: string) => void;
  increment: (k: Key, position: number, max: number) => number;
  setCount: (k: Key, position: number, count: number) => void;
  setIndex: (k: Key, index: number) => void;
  resetList: (k: Key) => void;
  resetAll: () => void;
}

export const listKey = (collectionId: string, bookId: string) => `${collectionId}/${bookId}`;

const EMPTY = (periodKey: string): ListProgress => ({ periodKey, index: 0, counts: [] });

/** Stored progress if it belongs to `periodKey`, otherwise an empty list (the reset). */
export function forPeriod(stored: ListProgress | undefined, periodKey: string): ListProgress {
  return stored && stored.periodKey === periodKey ? stored : EMPTY(periodKey);
}

export function readList(lists: Record<string, ListProgress>, k: Key): ListProgress {
  return forPeriod(lists[listKey(k.collectionId, k.bookId)], k.periodKey);
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => {
      const update = (k: Key, fn: (p: ListProgress) => ListProgress) =>
        set((s) => ({ lists: { ...s.lists, [listKey(k.collectionId, k.bookId)]: fn(readList(s.lists, k)) } }));

      return {
        lists: {},
        openedOn: {},
        markOpened: (collectionId, day) => set((s) => ({ openedOn: { ...s.openedOn, [collectionId]: day } })),
        increment: (k, position, max) => {
          const current = readList(get().lists, k).counts[position] ?? 0;
          const next = Math.min(max, current + 1);
          update(k, (p) => {
            const counts = [...p.counts];
            counts[position] = next;
            return { ...p, counts };
          });
          return next;
        },
        setCount: (k, position, count) =>
          update(k, (p) => {
            const counts = [...p.counts];
            counts[position] = count;
            return { ...p, counts };
          }),
        setIndex: (k, index) => update(k, (p) => ({ ...p, index })),
        resetList: (k) => update(k, () => EMPTY(k.periodKey)),
        resetAll: () => set({ lists: {} }),
      };
    },
    {
      name: 'progress',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ lists: s.lists, openedOn: s.openedOn }),
    },
  ),
);

export type ListState = 'untouched' | 'partial' | 'done';

export function listState(p: ListProgress, nums: number[]): ListState {
  const done = nums.filter((n, i) => (p.counts[i] ?? 0) >= n).length;
  if (nums.length && done === nums.length) return 'done';
  return p.counts.some((c) => c > 0) ? 'partial' : 'untouched';
}
