import athkarJson from '@content/athkar.json';
import calendarJson from '@content/calendar.json';
import collectionsJson from '@content/collections.json';
import manifestJson from '@content/manifest.json';
import quranJson from '@content/quran.json';
import recitersJson from '@content/reciters.json';
import tasbihJson from '@content/tasbih.json';
import baz from '@content/books/baz.json';
import general from '@content/books/general.json';
import uthaymeen from '@content/books/uthaymeen.json';
import { audioIndex } from './audio-index';
import type { Ayahs, Book, BookEntry, Collection, Evidence, Grade, Reciter, ResetAt, ResolvedEntry, SpecialDayText, TasbihPhrase, TasbihSequence, Thiker } from './types';

export type { Ayahs, Book, BookEntry, Collection, Evidence, Grade, Reciter, ResetAt, ResolvedEntry, SpecialDayText, TasbihPhrase, TasbihSequence, Thiker };

// Books must be listed here as well as in manifest.json: Metro needs static imports.
const BOOK_FILES: Record<string, Book> = { baz, uthaymeen, general } as Record<string, Book>;

export const manifest = manifestJson as { schemaVersion: number; contentVersion: number; defaultBook: string; books: string[] };
export const athkar = athkarJson as Record<string, Thiker>;
export const collections = collectionsJson as Record<string, Collection>;
export const reciters = recitersJson as Record<string, Reciter>;
/** KFGQPC source name and the basmalah drawn above a surah's opening. */
export const quran = quranJson as { source: string; basmalah: string };
export const tasbih = tasbihJson as { targets: number[]; phrases: TasbihPhrase[]; sequences: TasbihSequence[] };
/** Special days' texts (content/calendar.json); which day it is comes from lib/calendar. */
export const calendar = calendarJson as { days: Record<string, SpecialDayText> };

export const collectionIds = Object.keys(collections);

export function booksFor(collectionId: string): { id: string; name: string }[] {
  return manifest.books
    .filter((id) => BOOK_FILES[id]?.collections[collectionId]?.length)
    .map((id) => ({ id, name: BOOK_FILES[id].name }));
}

/** The book to use: the chosen one if it covers this collection, else the default, else the first that does. */
export function resolveBookId(collectionId: string, preferred?: string): string {
  const available = booksFor(collectionId).map((b) => b.id);
  if (preferred && available.includes(preferred)) return preferred;
  if (available.includes(manifest.defaultBook)) return manifest.defaultBook;
  return available[0];
}

export function getEntries(collectionId: string, bookId: string): ResolvedEntry[] {
  const list = BOOK_FILES[bookId]?.collections[collectionId] ?? [];
  return list.map((e) => ({ ...e, thiker: athkar[e.id] }));
}

/** Reciters with at least one recording in this list, with how many of its entries they cover. */
export function recitersFor(entries: BookEntry[]): { id: string; name: string; covered: number; total: number }[] {
  return Object.entries(reciters)
    .map(([id, r]) => {
      const recorded = new Set(r.recorded);
      return { id, name: r.name, covered: entries.filter((e) => recorded.has(e.id)).length, total: entries.length };
    })
    .filter((r) => r.covered > 0);
}

export function getAudio(reciterId: string, thikerId: string): number | undefined {
  return audioIndex[reciterId]?.[thikerId];
}
