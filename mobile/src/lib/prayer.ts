import { CalculationMethod, Coordinates, PrayerTimes } from 'adhan';
import { toHijri } from './hijri.ts';

export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type Prayer = (typeof PRAYERS)[number];
export type TimeName = Prayer | 'sunrise';
export const TIME_NAMES: TimeName[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const PRAYER_LABELS: Record<TimeName, string> = {
  fajr: 'الفجر',
  sunrise: 'الشروق',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

export type DayTimes = Record<TimeName, Date>;

export const METHODS = {
  UmmAlQura: 'أم القرى',
  Egyptian: 'الهيئة المصرية العامة للمساحة',
  MuslimWorldLeague: 'رابطة العالم الإسلامي',
  Dubai: 'دبي',
  Kuwait: 'الكويت',
  Qatar: 'قطر',
  Karachi: 'جامعة العلوم الإسلامية بكراتشي',
  Turkey: 'رئاسة الشؤون الدينية التركية',
  Singapore: 'سنغافورة',
  NorthAmerica: 'أمريكا الشمالية',
} as const;
export type MethodId = keyof typeof METHODS;

export interface Place {
  latitude: number;
  longitude: number;
  method: MethodId;
}

/** Whether a date falls in Ramadan (Umm al-Qura calendar, from the bundled table). */
export const isRamadan = (date: Date): boolean => toHijri(date)?.month === 9;

/**
 * The night between Maghrib and the next Fajr, as the Sunnah counts it: its middle, and the start
 * of its last third (the time of qiyam). Same arithmetic as adhan's SunnahTimes.
 */
export function nightTimes(maghrib: Date, nextFajr: Date): { middle: Date; lastThird: Date } {
  const night = nextFajr.getTime() - maghrib.getTime();
  return { middle: new Date(maghrib.getTime() + night / 2), lastThird: new Date(maghrib.getTime() + (night * 2) / 3) };
}

export function computeDayTimes(place: Place, date: Date): DayTimes {
  const params = CalculationMethod[place.method]();
  // Umm al-Qura: Isha is 120 min after Maghrib in Ramadan instead of 90.
  if (place.method === 'UmmAlQura' && isRamadan(date)) params.adjustments.isha += 30;
  const t = new PrayerTimes(new Coordinates(place.latitude, place.longitude), date, params);
  return { fajr: t.fajr, sunrise: t.sunrise, dhuhr: t.dhuhr, asr: t.asr, maghrib: t.maghrib, isha: t.isha };
}

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);

/** The next of the six times after `now` (rolls over to tomorrow's Fajr). */
export function nextTime(now: Date, today: DayTimes, tomorrow: DayTimes): { name: TimeName; at: Date } {
  for (const name of TIME_NAMES) if (today[name] > now) return { name, at: today[name] };
  return { name: 'fajr', at: tomorrow.fajr };
}

export function defaultMethodFor(countryCode?: string | null): MethodId {
  switch (countryCode?.toUpperCase()) {
    case 'EG': return 'Egyptian';
    case 'AE': return 'Dubai';
    case 'KW': return 'Kuwait';
    case 'QA': return 'Qatar';
    case 'PK': return 'Karachi';
    case 'TR': return 'Turkey';
    case 'SG': case 'MY': case 'ID': return 'Singapore';
    case 'US': case 'CA': return 'NorthAmerica';
    case 'SA': case 'YE': case 'BH': case 'OM': return 'UmmAlQura';
    default: return countryCode ? 'MuslimWorldLeague' : 'UmmAlQura';
  }
}

export interface City { name: string; latitude: number; longitude: number; country: string }

// Fallback when location permission is denied.
export const CITIES: City[] = [
  { name: 'مكة المكرمة', latitude: 21.4225, longitude: 39.8262, country: 'SA' },
  { name: 'المدينة المنورة', latitude: 24.4672, longitude: 39.6111, country: 'SA' },
  { name: 'الرياض', latitude: 24.7136, longitude: 46.6753, country: 'SA' },
  { name: 'جدة', latitude: 21.4858, longitude: 39.1925, country: 'SA' },
  { name: 'الدمام', latitude: 26.4207, longitude: 50.0888, country: 'SA' },
  { name: 'تبوك', latitude: 28.3835, longitude: 36.5662, country: 'SA' },
  { name: 'أبها', latitude: 18.2164, longitude: 42.5053, country: 'SA' },
  { name: 'حائل', latitude: 27.5114, longitude: 41.7208, country: 'SA' },
  { name: 'القصيم', latitude: 26.3260, longitude: 43.9750, country: 'SA' },
  { name: 'القاهرة', latitude: 30.0444, longitude: 31.2357, country: 'EG' },
  { name: 'دبي', latitude: 25.2048, longitude: 55.2708, country: 'AE' },
  { name: 'الكويت', latitude: 29.3759, longitude: 47.9774, country: 'KW' },
  { name: 'الدوحة', latitude: 25.2854, longitude: 51.5310, country: 'QA' },
  { name: 'المنامة', latitude: 26.2285, longitude: 50.5860, country: 'BH' },
  { name: 'مسقط', latitude: 23.5880, longitude: 58.3829, country: 'OM' },
  { name: 'عمّان', latitude: 31.9539, longitude: 35.9106, country: 'JO' },
  { name: 'إسطنبول', latitude: 41.0082, longitude: 28.9784, country: 'TR' },
  { name: 'لندن', latitude: 51.5072, longitude: -0.1276, country: 'GB' },
  { name: 'كوالالمبور', latitude: 3.1390, longitude: 101.6869, country: 'MY' },
];
