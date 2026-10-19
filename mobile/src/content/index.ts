import athkarJson from '@content/athkar.json';
import calendarJson from '@content/calendar.json';
import hadithsJson from '@content/hadiths.json';
import manifestJson from '@content/manifest.json';
import quranJson from '@content/quran.json';
import recitersJson from '@content/reciters.json';
import sectionsJson from '@content/sections.json';
import tasbihJson from '@content/tasbih.json';
import baz from '@content/books/baz.json';
import hisn from '@content/books/hisn.json';
import qasim from '@content/books/qasim.json';
import uthaymeen from '@content/books/uthaymeen.json';
import { plainArabic } from '@/lib/arabic';
import { audioIndex } from './audio-index';
import type {
  Ayahs, Book, BookEntry, Chapter, Collection, Evidence, Grade, Hadith, ListItem, Reciter, ResetAt, ResolvedEntry,
  Section, SectionKind, SpecialDayText, TasbihPhrase, TasbihSequence, Thiker,
} from './types';

export type {
  Ayahs, Book, BookEntry, Chapter, Collection, Evidence, Grade, Hadith, ListItem, Reciter, ResetAt, ResolvedEntry,
  Section, SectionKind, SpecialDayText, TasbihPhrase, TasbihSequence, Thiker,
};

// Books must be listed here as well as in manifest.json: Metro needs static imports.
const BOOK_FILES: Record<string, Book> = { hisn, baz, qasim, uthaymeen } as Record<string, Book>;

export const manifest = manifestJson as { schemaVersion: number; contentVersion: number; defaultBook: string; books: string[] };
export const athkar = athkarJson as Record<string, Thiker>;
export const hadiths = hadithsJson as Record<string, Hadith>;
export const reciters = recitersJson as Record<string, Reciter>;
/** KFGQPC source name and the basmalah drawn above a surah's opening. */
export const quran = quranJson as { source: string; basmalah: string };
export const tasbih = tasbihJson as { targets: number[]; phrases: TasbihPhrase[]; sequences: TasbihSequence[] };
/** Special days' texts (content/calendar.json); which day it is comes from lib/calendar. */
export const calendar = calendarJson as { days: Record<string, SpecialDayText> };

/** Every section, in display order, and the groups that hold them («الأوراد اليومية»، «السفر»…). */
export const groups = sectionsJson.groups as Record<string, string>;
export const sections = sectionsJson.sections as Record<string, Section>;

/** The wirds — sections that are counted and reset with their time (home rows, progress, suggestions). */
export const collections = Object.fromEntries(
  Object.entries(sections).filter(([, s]) => s.kind === 'wird'),
) as Record<string, Collection>;
export const collectionIds = Object.keys(collections);

/** Sections grouped for the «جميع الأذكار» screen, keeping only those some book fills. */
export function sectionGroups(): { id: string; title: string; sections: { id: string; title: string; kind: SectionKind }[] }[] {
  return Object.entries(groups)
    .map(([id, title]) => ({
      id,
      title,
      sections: Object.entries(sections)
        .filter(([sid, s]) => s.group === id && booksFor(sid).length > 0)
        .map(([sid, s]) => ({ id: sid, title: s.title, kind: s.kind })),
    }))
    .filter((g) => g.sections.length > 0);
}

/** «تحفة الأخيار — ابن باز»: the book's title with its author, or whichever of the two it has. */
export function bookName(bookId: string): string {
  const b = BOOK_FILES[bookId];
  return [b?.title, b?.author].filter(Boolean).join(' — ');
}

export function getBook(bookId: string): Book | undefined {
  return BOOK_FILES[bookId];
}

/** Books in the library, in manifest order. */
export function libraryBooks(): { id: string; title: string; author?: string; chapters: number }[] {
  return manifest.books
    .filter((id) => BOOK_FILES[id])
    .map((id) => ({ id, title: BOOK_FILES[id].title ?? bookName(id), author: BOOK_FILES[id].title ? BOOK_FILES[id].author : undefined, chapters: BOOK_FILES[id].chapters.length }));
}

const inSection = (sectionId: string) => (e: BookEntry) => !e.only || e.only === sectionId;
const chaptersFor = (sectionId: string, bookId: string): Chapter[] =>
  BOOK_FILES[bookId]?.chapters.filter((c) => c.sections?.includes(sectionId)) ?? [];

export function booksFor(sectionId: string): { id: string; name: string }[] {
  return manifest.books
    .filter((id) => chaptersFor(sectionId, id).some((c) => c.entries.some((e) => e.id && inSection(sectionId)(e))))
    .map((id) => ({ id, name: bookName(id) }));
}

/**
 * The book to use: the chosen one if it covers this section; else, for a wird, the default book (the
 * shorter daily list), and for a reading list the first in library order (the fullest, حصن المسلم).
 */
export function resolveBookId(sectionId: string, preferred?: string): string {
  const available = booksFor(sectionId).map((b) => b.id);
  if (preferred && available.includes(preferred)) return preferred;
  if (sections[sectionId]?.kind === 'wird' && available.includes(manifest.defaultBook)) return manifest.defaultBook;
  return available[0];
}

function evidenceOf(e: BookEntry): { fadl?: string; evidence?: Evidence } {
  const h = e.hadith ? hadiths[e.hadith] : undefined;
  const evidence = h ? { text: h.text, source: h.source, grade: h.grade, gradeNote: h.gradeNote } : undefined;
  return { fadl: e.fadl ?? h?.fadl, evidence };
}

function resolve(e: BookEntry): ResolvedEntry {
  return { id: e.id!, num: e.num ?? 1, thiker: athkar[e.id!], note: e.note, ...evidenceOf(e) };
}

/** The athkar of a section in one book, in the book's order — what the counted reader walks through. */
export function getEntries(sectionId: string, bookId: string): ResolvedEntry[] {
  return chaptersFor(sectionId, bookId).flatMap((c) => c.entries.filter((e) => e.id && inSection(sectionId)(e)).map(resolve));
}

function toItems(chapter: Chapter, keep: (e: BookEntry) => boolean): ListItem[] {
  return chapter.entries.filter(keep).map((e): ListItem =>
    e.guide !== undefined
      ? { type: 'guide', chapter: chapter.title, guide: e.guide, ...evidenceOf(e) }
      : { type: 'thiker', chapter: chapter.title, ...resolve(e) });
}

/** A reading list: everything a book says under a section, guidance included, with chapter titles. */
export function getList(sectionId: string, bookId: string): ListItem[] {
  return chaptersFor(sectionId, bookId).flatMap((c) => toItems(c, inSection(sectionId)));
}

/** One chapter of a book as the library shows it. */
export function getChapter(bookId: string, index: number): { title: string; items: ListItem[] } | undefined {
  const c = BOOK_FILES[bookId]?.chapters[index];
  return c && { title: c.title, items: toItems(c, () => true) };
}

let searchIndex: Map<string, string> | undefined;
const thikerLetters = (id: string) => {
  searchIndex ??= new Map(Object.entries(athkar).map(([k, t]) => [k, plainArabic(`${t.title} ${t.text}`)]));
  return searchIndex.get(id) ?? '';
};

/**
 * Sections for a search: those whose title matches, then those holding a thiker whose words match
 * (with that thiker's title, so the user sees why). Letters only — harakat never get in the way.
 */
export function searchSections(query: string): { id: string; title: string; kind: SectionKind; match?: string }[] {
  const q = plainArabic(query);
  if (!q) return [];
  const out: { id: string; title: string; kind: SectionKind; match?: string }[] = [];
  for (const [id, s] of Object.entries(sections)) {
    if (!booksFor(id).length) continue;
    if (plainArabic(s.title).includes(q)) { out.push({ id, title: s.title, kind: s.kind }); continue; }
    const hit = manifest.books
      .flatMap((b) => chaptersFor(id, b).flatMap((c) => c.entries))
      .find((e) => e.id && thikerLetters(e.id).includes(q));
    if (hit?.id) out.push({ id, title: s.title, kind: s.kind, match: athkar[hit.id].title });
  }
  return out;
}

/** Reciters with at least one recording in this list, with how many of its entries they cover. */
export function recitersFor(entries: { id: string }[]): { id: string; name: string; covered: number; total: number }[] {
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
