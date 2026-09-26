import { toArabicDigits } from './arabic.ts';
import { HIJRI_BASE_DAY, HIJRI_BASE_YEAR, HIJRI_LENGTHS } from './hijri-table.ts';

/** Umm al-Qura Hijri dates from a generated table (scripts/gen-hijri.mjs), 1440–1500 AH. */

export interface Hijri {
  year: number;
  /** 1 = محرم … 12 = ذو الحجة */
  month: number;
  day: number;
}

export const HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];
export const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const GREGORIAN_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

/** The phone's local calendar day, counted from 1970-01-01. */
const localDay = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);

/**
 * The Hijri date of `date`'s civil day. `offset` shifts it by whole days (settings → التقويم) for
 * places that follow local moon sighting. Null outside the table.
 */
export function toHijri(date: Date, offset = 0): Hijri | null {
  let n = localDay(date) + offset - HIJRI_BASE_DAY;
  if (n < 0) return null;
  for (let i = 0; i < HIJRI_LENGTHS.length; i++) {
    const len = HIJRI_LENGTHS[i] === '1' ? 30 : 29;
    if (n < len) return { year: HIJRI_BASE_YEAR + Math.floor(i / 12), month: (i % 12) + 1, day: n + 1 };
    n -= len;
  }
  return null;
}

/** «١٤ ربيع الآخر ١٤٤٨» */
export const formatHijri = (h: Hijri) => `${toArabicDigits(h.day)} ${HIJRI_MONTHS[h.month - 1]} ${toArabicDigits(h.year)}`;

/** «الجمعة ١٤ ربيع الآخر ١٤٤٨ · ٢٥ سبتمبر» */
export function formatDateLine(date: Date, offset = 0): string {
  const h = toHijri(date, offset);
  const greg = `${toArabicDigits(date.getDate())} ${GREGORIAN_MONTHS[date.getMonth()]}`;
  return h ? `${WEEKDAYS[date.getDay()]} ${formatHijri(h)} · ${greg}` : `${WEEKDAYS[date.getDay()]} ${greg}`;
}
