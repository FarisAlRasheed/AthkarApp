export type Grade = 'صحيح' | 'حسن' | 'ضعيف' | 'موضوع';
export type ResetAt = 'fajr' | 'asr' | 'isha' | 'each-prayer';
/** A wird is counted and resets with its time; a list is read, with nothing saved. */
export type SectionKind = 'wird' | 'list';

/** Verses `from`–`to` of surah `sura`; their text comes from KFGQPC (scripts/quran-text.mjs). */
export interface Ayahs {
  sura: number;
  from: number;
  to: number;
}

/** The words of one thiker — the single source every book and section points to. */
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

/** One narration, shared by every book that cites it (content/hadiths.json). */
export interface Hadith {
  /** The narration itself, when the book quotes it. */
  text?: string;
  fadl?: string;
  source: string;
  grade?: Grade;
  gradeNote?: string;
}

/** What the reading page shows under «فضل الذكر ودليله». */
export interface Evidence {
  text?: string;
  source?: string;
  grade?: Grade;
  gradeNote?: string;
}

/** A place in a book: a thiker with this book's count and context, or a line of guidance. */
export interface BookEntry {
  id?: string;
  num?: number;
  hadith?: string;
  /** This book's own wording of the virtue; otherwise the hadith's. */
  fadl?: string;
  /** When or how to say it («يقولها إذا تقلب من الليل»). */
  note?: string;
  /** In a chapter shared by morning and evening: the one section this entry belongs to. */
  only?: string;
  /** Guidance with no words to say («يبدأ برجله اليمنى»). Lists only. */
  guide?: string;
}

export interface Chapter {
  title: string;
  /** The app sections this chapter fills; empty = shown only in the library. */
  sections?: string[];
  entries: BookEntry[];
}

export interface Book {
  title?: string;
  author?: string;
  source?: { turath?: number };
  chapters: Chapter[];
}

export interface Section {
  title: string;
  group: string;
  kind: SectionKind;
  /** A wird's time window (lib/schedule periodKey). */
  resetAt?: ResetAt;
  /** The verse shown when a wird opens (DESIGN_PLAN §7.3). */
  opening?: { ayahs: Ayahs; text: string };
}

/** A wird: a section that is counted and resets on its own. */
export interface Collection extends Section {
  kind: 'wird';
  resetAt: ResetAt;
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
export interface ResolvedEntry {
  id: string;
  num: number;
  thiker: Thiker;
  fadl?: string;
  note?: string;
  evidence?: Evidence;
}

/** One item in a reading list: a thiker or a line of guidance, under its chapter's title. */
export type ListItem =
  | ({ type: 'thiker'; chapter: string } & ResolvedEntry)
  | { type: 'guide'; chapter: string; guide: string; fadl?: string; evidence?: Evidence };
