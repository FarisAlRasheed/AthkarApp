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

/**
 * A calm countdown (DESIGN_PLAN §7.2): «١:٢٣» over an hour, «٢٣ دقيقة» under an hour, and only in
 * the last ten minutes the ticking «٩:٤٥».
 */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h) return toArabicDigits(`${h}:${String(m).padStart(2, '0')}`);
  if (total >= 600) return `${toArabicDigits(m)} ${m === 10 ? 'دقائق' : 'دقيقة'}`;
  return toArabicDigits(`${m}:${String(total % 60).padStart(2, '0')}`);
}

/** Whether formatRemaining needs to tick every second. */
export const ticksBySecond = (ms: number) => ms < 600_000;

/** «بعد ٢:١٠» style short duration: hours and minutes. */
export function formatIn(ms: number): string {
  const mins = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${toArabicDigits(m)} د`;
  return toArabicDigits(`${h}:${String(m).padStart(2, '0')}`);
}
