export type Grade = 'صحيح' | 'حسن' | 'ضعيف' | 'موضوع';
export type ResetAt = 'fajr' | 'asr' | 'isha' | 'each-prayer';

export interface Thiker {
  title: string;
  text: string;
  quran?: boolean;
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

/** One card in the reading page: the words plus this book's count, virtue and evidence. */
export interface ResolvedEntry extends BookEntry {
  thiker: Thiker;
}
