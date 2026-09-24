/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatCountdown, formatTime, toArabicDigits } from './arabic.ts';
import { computeDayTimes, type DayTimes } from './prayer.ts';
import { dateKey, fittingCollections, periodKey, suggest, type TimesFor } from './schedule.ts';

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
