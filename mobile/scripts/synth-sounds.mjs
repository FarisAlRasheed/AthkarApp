#!/usr/bin/env node
/**
 * Writes placeholder tap sounds (short, soft clicks) until real recordings replace them
 * (DESIGN_PLAN §5, §12): assets/sounds/beads/{bead-1..3,separator,imam}.wav and
 * assets/sounds/count/tap-{1,2}.wav. Replace any file with a recording of the same name — a real
 * misbaha, recorded close in a quiet room — then run `node scripts/gen-sound-index.mjs`.
 * Only writes files that don't exist, so it never overwrites a recording.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 44_100;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

/** A struck small body: a noise transient, a few decaying partials and a soft thump. */
function strike({ partials, decay, thump = 0.3, noise = 0.35, length = 0.14, seed = 1 }) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const out = new Float32Array(Math.round(RATE * length));
  for (let n = 0; n < out.length; n++) {
    const t = n / RATE;
    let v = noise * rnd() * Math.exp(-t / 0.0015);
    for (const [f, a] of partials) v += a * Math.sin(2 * Math.PI * f * t) * Math.exp(-t / decay);
    v += thump * Math.sin(2 * Math.PI * 170 * t) * Math.exp(-t / 0.012);
    // Soft attack so there is no hard edge at the start.
    out[n] = v * Math.min(1, t / 0.0006);
  }
  return out;
}

const mix = (...parts) => {
  const len = Math.max(...parts.map(([buf, at]) => buf.length + Math.round(at * RATE)));
  const out = new Float32Array(len);
  for (const [buf, at] of parts) buf.forEach((v, i) => { out[i + Math.round(at * RATE)] += v; });
  return out;
};

function wav(samples, peak) {
  const max = samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round((v / max) * peak * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const sounds = {
  'beads/bead-1.wav': [strike({ partials: [[2350, 1], [5300, 0.3]], decay: 0.018, seed: 3 }), 0.5],
  'beads/bead-2.wav': [strike({ partials: [[2520, 1], [5650, 0.28]], decay: 0.016, seed: 7 }), 0.47],
  'beads/bead-3.wav': [strike({ partials: [[2200, 1], [5050, 0.32]], decay: 0.02, seed: 11 }), 0.5],
  'beads/separator.wav': [strike({ partials: [[1380, 1], [3100, 0.35]], decay: 0.03, thump: 0.5, length: 0.2, seed: 5 }), 0.6],
  'beads/imam.wav': [mix(
    [strike({ partials: [[900, 1], [1900, 0.4]], decay: 0.04, thump: 0.6, length: 0.25, seed: 13 }), 0],
    [strike({ partials: [[1350, 0.8], [2900, 0.3]], decay: 0.03, thump: 0.4, length: 0.2, seed: 17 }), 0.07],
  ), 0.65],
  'count/tap-1.wav': [strike({ partials: [[720, 1], [1560, 0.25]], decay: 0.022, noise: 0.15, thump: 0.45, seed: 19 }), 0.35],
  'count/tap-2.wav': [strike({ partials: [[680, 1], [1490, 0.25]], decay: 0.024, noise: 0.15, thump: 0.45, seed: 23 }), 0.35],
};

for (const [file, [samples, peak]] of Object.entries(sounds)) {
  const path = join(ROOT, file);
  if (existsSync(path)) continue;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, wav(samples, peak));
  console.log(`wrote ${file}`);
}
