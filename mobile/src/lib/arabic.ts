const DIGITS = '٠١٢٣٤٥٦٧٨٩';

export const toArabicDigits = (v: string | number) => String(v).replace(/\d/g, (d) => DIGITS[Number(d)]);

/** «٤:٣٣ ص» */
export function formatTime(d: Date): string {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${toArabicDigits(`${h % 12 || 12}:${m}`)} ${h < 12 ? 'ص' : 'م'}`;
}

/** «١:٢٣:٤٥» — hours omitted under an hour. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return toArabicDigits(h ? `${h}:${mm}:${ss}` : `${m}:${ss}`);
}

/** «بعد ٢:١٠» style short duration: hours and minutes. */
export function formatIn(ms: number): string {
  const mins = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${toArabicDigits(m)} د`;
  return toArabicDigits(`${h}:${String(m).padStart(2, '0')}`);
}
