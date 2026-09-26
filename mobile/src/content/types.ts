export type Grade = 'صحيح' | 'حسن' | 'ضعيف' | 'موضوع';
export type ResetAt = 'fajr' | 'asr' | 'isha' | 'each-prayer';

/** Verses `from`–`to` of surah `sura`; their text comes from KFGQPC (scripts/quran-text.mjs). */
export interface Ayahs {
  sura: number;
  from: number;
  to: number;
}

export interface Thiker {
  title: string;
  text: string;
  quran?: boolean;
  /** Quranic athkar: which verses the text is. Drawn in the KFGQPC font. */
  ayahs?: Ayahs;
  /** Shown on its own line above the verses (a surah's opening). */
  basmalah?: boolean;
  translations?: Record<string, string>;
}

export interface Evidence {
  text?: string;
  source?: string;
  grade?: Grade;
  gradeNote?: string;
}

export interface BookEntry {
  id: string;
  num: number;
  fadl?: string;
  evidence?: Evidence;
}

export interface Book {
  name: string;
  collections: Partial<Record<string, BookEntry[]>>;
}

export interface Collection {
  title: string;
  resetAt: ResetAt;
  /** The verse shown when the collection opens (DESIGN_PLAN §7.3). */
  opening?: { ayahs: Ayahs; text: string };
}

export interface Reciter {
  name: string;
  recorded: string[];
}

export interface TasbihPhrase {
  id: string;
  text: string;
  target: number;
}

/** A run of phrases counted one after another (تسبيح دبر الصلاة). */
export interface TasbihSequence {
  id: string;
  title: string;
  steps: { phrase: string; count: number }[];
}

export interface SpecialDayText {
  title: string;
  text: string;
  /** A tasbih phrase the card opens. */
  tasbih?: string;
}

/** One card in the reading page: the words plus this book's count, virtue and evidence. */
export interface ResolvedEntry extends BookEntry {
  thiker: Thiker;
}
