import { addDays, PRAYER_LABELS, PRAYERS } from '@/lib/prayer';
import { SLEEP_AFTER_ISHA } from '@/lib/schedule';
import { timesFor } from '@/store/clock';
import { useNotify } from '@/store/notify';

const DAYS = 7;

export type Reminder = { at: Date; title: string; body: string; url: string };

/** The reminders that are on, for the next 7 days (shared by notify.ts and notify.web.ts). */
export function reminders(from: Date): Reminder[] {
  const n = useNotify.getState();
  const out: Reminder[] = [];
  for (let d = 0; d < DAYS; d++) {
    const t = timesFor(addDays(from, d));
    for (const p of PRAYERS) {
      if (n.prayers[p]) out.push({ at: t[p], title: `صلاة ${PRAYER_LABELS[p]}`, body: 'حان وقت الصلاة', url: '/' });
    }
    if (n.morning) out.push({ at: new Date(t.fajr.getTime() + n.morningAfter * 60_000), title: 'أذكار الصباح', body: 'أصبحنا وأصبح الملك لله — حان وقت أذكار الصباح', url: '/read/morning' });
    if (n.evening) out.push({ at: new Date(t.asr.getTime() + n.eveningAfter * 60_000), title: 'أذكار المساء', body: 'حان وقت أذكار المساء', url: '/read/evening' });
    if (n.sleep) out.push({ at: new Date(t.isha.getTime() + SLEEP_AFTER_ISHA), title: 'أذكار النوم', body: 'اختم يومك بذكر الله', url: '/read/sleep' });
  }
  return out.filter((r) => r.at > from).sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 60);
}
