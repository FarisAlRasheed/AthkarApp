/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatCountdown, formatRemaining, formatTime, ticksBySecond, toArabicDigits } from './arabic.ts';
import { specialDay } from './calendar.ts';
import { formatHijri, toHijri } from './hijri.ts';
import { crossed, positionFor, stringFor } from './misbaha.ts';
import { computeDayTimes, nightTimes, type DayTimes } from './prayer.ts';
import { dateKey, fittingCollections, periodKey, suggest, type TimesFor } from './schedule.ts';
import { clockLook, moonPhase, sunProgress } from './sky.ts';

// Fixed, round prayer times so expectations are easy to read.
const at = (d: Date, hh: number, mm = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm);
const timesFor: TimesFor = (d) => ({
  fajr: at(d, 4, 30), sunrise: at(d, 5, 50), dhuhr: at(d, 11, 45),
  asr: at(d, 15, 10), maghrib: at(d, 17, 50), isha: at(d, 19, 20),
}) as DayTimes;
const day = new Date(2026, 8, 24);

test('period keys roll over at their prayer, not at midnight', () => {
  assert.equal(periodKey('fajr', at(day, 3, 0), timesFor), '2026-09-23');
  assert.equal(periodKey('fajr', at(day, 4, 30), timesFor), '2026-09-24');
  assert.equal(periodKey('asr', at(day, 15, 9), timesFor), '2026-09-23');
  assert.equal(periodKey('asr', at(day, 15, 10), timesFor), '2026-09-24');
  // Sleep started at yesterday's Isha is still the same period after midnight.
  assert.equal(periodKey('isha', at(day, 1, 0), timesFor), '2026-09-23');
});

test('post-prayer period follows the last prayer, including before Fajr', () => {
  assert.equal(periodKey('each-prayer', at(day, 12, 0), timesFor), '2026-09-24-dhuhr');
  assert.equal(periodKey('each-prayer', at(day, 2, 0), timesFor), '2026-09-23-isha');
  assert.equal(periodKey('each-prayer', at(day, 23, 0), timesFor), '2026-09-24-isha');
});

test('fitting collections by time of day', () => {
  const t = timesFor(day);
  assert.deepEqual(fittingCollections(at(day, 4, 40), t), ['post-prayer', 'morning']);
  assert.deepEqual(fittingCollections(at(day, 9, 0), t), ['morning']);
  assert.deepEqual(fittingCollections(at(day, 13, 0), t), ['morning']);
  assert.deepEqual(fittingCollections(at(day, 16, 0), t), ['evening']);
  assert.deepEqual(fittingCollections(at(day, 19, 52), t), ['evening']);
  assert.deepEqual(fittingCollections(at(day, 19, 55), t), ['sleep']);
  assert.deepEqual(fittingCollections(at(day, 2, 0), t), ['sleep']);
});

test('suggestion skips done collections and falls back to المسبحة with the next start', () => {
  const none = () => false;
  assert.deepEqual(suggest(at(day, 4, 40), timesFor, none).suggestion, { kind: 'collection', collectionId: 'post-prayer' });
  const postDone = (c: string) => c === 'post-prayer';
  assert.deepEqual(suggest(at(day, 4, 40), timesFor, postDone).suggestion, { kind: 'collection', collectionId: 'morning' });

  const all = () => true;
  const r = suggest(at(day, 13, 0), timesFor, all);
  assert.deepEqual(r.suggestion, { kind: 'tasbih' });
  assert.equal(r.next?.collectionId, 'evening');
  assert.equal(r.next?.at.getHours(), 15);

  const late = suggest(at(day, 23, 0), timesFor, all);
  assert.equal(late.next?.collectionId, 'morning');
  assert.equal(dateKey(late.next!.at), '2026-09-25');
});

test('adhan gives plausible Riyadh times with Umm al-Qura', () => {
  const t = computeDayTimes({ latitude: 24.7136, longitude: 46.6753, method: 'UmmAlQura' }, new Date(2026, 8, 24, 12));
  const hm = (d: Date) => d.getUTCHours() + 3 + d.getUTCMinutes() / 60; // Riyadh is UTC+3
  assert.ok(hm(t.fajr) > 4 && hm(t.fajr) < 4.9, `fajr ${t.fajr.toISOString()}`);
  assert.ok(hm(t.maghrib) > 17.5 && hm(t.maghrib) < 18.3, `maghrib ${t.maghrib.toISOString()}`);
  // Umm al-Qura outside Ramadan: Isha is 90 minutes after Maghrib.
  assert.equal(Math.round((t.isha.getTime() - t.maghrib.getTime()) / 60000), 90);
});

test('arabic formatting', () => {
  assert.equal(toArabicDigits(2026), '٢٠٢٦');
  assert.equal(formatTime(at(day, 16, 5)), '٤:٠٥ م');
  assert.equal(formatTime(at(day, 0, 30)), '١٢:٣٠ ص');
  assert.equal(formatCountdown(3_723_000), '١:٠٢:٠٣');
  assert.equal(formatCountdown(65_000), '١:٠٥');
});

test('calm countdown: hours and minutes, minutes, then seconds only at the end', () => {
  assert.equal(formatRemaining(3_723_000), '١:٠٢');
  assert.equal(formatRemaining(23 * 60_000 + 5_000), '٢٣ دقيقة');
  assert.equal(formatRemaining(10 * 60_000), '١٠ دقائق');
  assert.equal(formatRemaining(9 * 60_000 + 45_000), '٩:٤٥');
  assert.equal(ticksBySecond(9 * 60_000), true);
  assert.equal(ticksBySecond(11 * 60_000), false);
});

test('Hijri dates match ICU Umm al-Qura', () => {
  assert.deepEqual(toHijri(new Date(2026, 8, 25)), { year: 1448, month: 4, day: 14 });
  assert.equal(formatHijri(toHijri(new Date(2026, 8, 25))!), '١٤ ربيع الآخر ١٤٤٨');
  assert.deepEqual(toHijri(new Date(2026, 8, 25), 1), { year: 1448, month: 4, day: 15 });
  const icu = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' });
  for (let i = 0; i < 400; i++) {
    const d = new Date(2019, 0, 1 + i * 47);
    const o = Object.fromEntries(icu.formatToParts(d).map((p) => [p.type, p.value]));
    assert.deepEqual(toHijri(d), { year: +o.year, month: +o.month, day: +o.day }, d.toDateString());
  }
});

test('special days begin at the Maghrib before them', () => {
  const fri = new Date(2026, 8, 25); // Friday 14 Rabi al-Akhir 1448
  const maghrib = at(fri, 17, 50);
  assert.equal(specialDay(at(fri, 12, 0), maghrib), 'friday');
  // After Friday's Maghrib it is the eve of the 15th: a white day.
  assert.equal(specialDay(at(fri, 19, 0), maghrib), 'white-days');
  // Thursday evening is already Friday.
  const thu = new Date(2026, 8, 24);
  assert.equal(specialDay(at(thu, 19, 0), at(thu, 17, 50)), 'friday');
  // Thursday before Maghrib: the 13th, a white day, outranks Thursday fasting.
  assert.equal(specialDay(at(thu, 12, 0), at(thu, 17, 50)), 'white-days');
});

test('the misbaha is strung like a real one', () => {
  const s = stringFor(33);
  assert.equal(s.seq.length, 36); // 33 beads, 2 separators, the imam
  assert.equal(s.seq[11], 'separator');
  assert.equal(s.seq[23], 'separator');
  assert.equal(s.seq[35], 'imam');
  assert.equal(positionFor(10, s), 10);
  assert.equal(positionFor(11, s), 12); // the 11th bead takes its separator with it
  assert.equal(positionFor(33, s), 36); // …and the 33rd the imam
  assert.equal(positionFor(34, s), 37);
  assert.deepEqual([crossed(10, s), crossed(11, s), crossed(33, s), crossed(34, s)], ['bead', 'separator', 'imam', 'bead']);
  assert.equal(stringFor(99).seq.filter((p) => p === 'separator').length, 2);
  assert.equal(stringFor(7).seq.filter((p) => p === 'separator').length, 0);
  assert.equal(stringFor(null).beads, 33);
  assert.equal(stringFor(500).beads, 100);
});

test('the sky blends continuously and the night is split as the Sunnah counts it', () => {
  const t = timesFor(day);
  const a = clockLook(at(day, 12, 0), timesFor);
  const b = clockLook(at(day, 12, 1), timesFor);
  assert.notEqual(a.stops[0], clockLook(at(day, 23, 0), timesFor).stops[0]);
  assert.ok(Math.abs(parseInt(a.stops[0].slice(1, 3), 16) - parseInt(b.stops[0].slice(1, 3), 16)) <= 2, 'no jump in a minute');
  assert.equal(sunProgress(at(day, 2, 0), t), null);
  assert.ok(Math.abs(sunProgress(t.dhuhr, t)! - 0.5) < 0.1);
  const night = nightTimes(t.maghrib, at(new Date(2026, 8, 25), 4, 30));
  // 17:50 → 04:30 is 10 h 40 min: the middle at 23:10, the last third from 00:56.
  assert.deepEqual([night.middle.getHours(), night.middle.getMinutes()], [23, 10]);
  assert.deepEqual([night.lastThird.getHours(), night.lastThird.getMinutes()], [0, 56]);
  const full = moonPhase(new Date(Date.UTC(2026, 8, 26, 16)));
  assert.ok(full.illumination > 0.95, `illumination ${full.illumination}`);
});
