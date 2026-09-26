#!/usr/bin/env node
/**
 * Fills the text of every Quranic thiker from the King Fahd Complex (KFGQPC) Hafs V30 release, so
 * Quranic text is never typed by hand. A thiker opts in with `ayahs: { sura, from, to }`.
 *
 *   npm run content:quran
 *
 * The source is the Word document KFGQPC ships with the font (content/sources/KFGQPC-Hafs-V30.docx):
 * every surah is a title paragraph «سُورَةُ …», then its verses, each ending with «۝» and its number.
 * The text must be drawn with the matching font — mobile/assets/fonts/KFGQPC-Hafs-V30.ttf — which
 * turns «۝١» into a verse mark. Text and font come from the same release; never mix versions.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { validateContent } from './validate-content.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'content');
const SOURCE = join(CONTENT, 'sources', 'KFGQPC-Hafs-V30.docx');
const SOURCE_NAME = 'KFGQPC Hafs V30';
const VERSES_TOTAL = 6236;
const NBSP = ' ';
const DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Reads one file out of a zip archive (a .docx is a zip). */
function unzipEntry(zip, name) {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('Not a zip file');
  let p = zip.readUInt32LE(eocd + 16);
  const count = zip.readUInt16LE(eocd + 10);
  for (let i = 0; i < count; i++) {
    const method = zip.readUInt16LE(p + 10);
    const size = zip.readUInt32LE(p + 20);
    const nameLen = zip.readUInt16LE(p + 28);
    const extraLen = zip.readUInt16LE(p + 30);
    const commentLen = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    if (zip.toString('utf8', p + 46, p + 46 + nameLen) === name) {
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + size);
      return method === 0 ? data : inflateRawSync(data);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`${name} not found in the archive`);
}

const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const toNumber = (s) => Number([...s].map((c) => DIGITS.indexOf(c)).join(''));
const squash = (s) => s.replace(/\s+/g, ' ').trim();

/** Verses by surah: verses[sura][aya - 1], each without its number and without a leading ۞. */
function readVerses(docx) {
  const xml = unzipEntry(docx, 'word/document.xml').toString('utf8');
  const paragraphs = xml.split('</w:p>').map((p) => {
    let text = '';
    p.replace(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g, (_, t) => { text += t; return ''; });
    return squash(decode(text));
  }).filter(Boolean);

  const bodies = [];
  for (const p of paragraphs) {
    if (p.startsWith('سُورَةُ ')) bodies.push('');
    else if (bodies.length) bodies[bodies.length - 1] += ` ${p}`;
  }
  if (bodies.length !== 114) throw new Error(`Expected 114 surahs, found ${bodies.length}`);

  const verses = [null];
  let basmalah = '';
  bodies.forEach((body, i) => {
    const sura = i + 1;
    const list = [];
    for (const m of body.matchAll(/([^۝]+?)\s*۝([٠-٩]+)/g)) {
      if (toNumber(m[2]) !== list.length + 1) throw new Error(`Surah ${sura}: verse ${list.length + 1} is out of order`);
      list.push(squash(m[1]).replace(/^۞\s*/, ''));
    }
    if (sura === 1) basmalah = list[0];
    // Every surah but al-Fatiha (where it is verse 1) and at-Tawba opens with an unnumbered basmalah.
    else if (list[0].startsWith(basmalah)) list[0] = squash(list[0].slice(basmalah.length));
    verses.push(list);
  });
  const total = verses.slice(1).reduce((n, v) => n + v.length, 0);
  if (total !== VERSES_TOTAL) throw new Error(`Expected ${VERSES_TOTAL} verses, found ${total}`);
  return { verses, basmalah };
}

const { verses, basmalah } = readVerses(readFileSync(SOURCE));

/** Verses `from`–`to` of `sura`, each followed by its verse mark. */
function quranText(where, { sura, from, to }) {
  const parts = [];
  for (let a = from; a <= to; a++) {
    const v = verses[sura]?.[a - 1];
    if (!v) throw new Error(`${where}: verse ${sura}:${a} does not exist`);
    // A no-break space keeps each verse mark on the same line as the verse's last word.
    parts.push(`${v}${NBSP}۝${[...String(a)].map((d) => DIGITS[Number(d)]).join('')}`);
  }
  return parts.join(' ');
}

let changed = 0;
const fill = (where, holder, ayahs) => {
  const text = quranText(where, ayahs);
  if (holder.text !== text) {
    holder.text = text;
    changed++;
    console.log(`updated ${where} (${ayahs.sura}:${ayahs.from}-${ayahs.to})`);
  }
};

const athkarPath = join(CONTENT, 'athkar.json');
const athkar = JSON.parse(readFileSync(athkarPath, 'utf8'));
for (const [id, t] of Object.entries(athkar)) if (t.ayahs) fill(id, t, t.ayahs);

// The verse shown when a collection opens (DESIGN_PLAN §7.3).
const collectionsPath = join(CONTENT, 'collections.json');
const collections = JSON.parse(readFileSync(collectionsPath, 'utf8'));
for (const [id, c] of Object.entries(collections)) if (c.opening) fill(`collections/${id}`, c.opening, c.opening.ayahs);

const quranPath = join(CONTENT, 'quran.json');
const quran = `${JSON.stringify({ source: SOURCE_NAME, basmalah }, null, 2)}\n`;
let quranChanged = true;
try { quranChanged = readFileSync(quranPath, 'utf8') !== quran; } catch { /* first run */ }

if (changed || quranChanged) {
  writeFileSync(athkarPath, `${JSON.stringify(athkar, null, 2)}\n`);
  writeFileSync(collectionsPath, `${JSON.stringify(collections, null, 2)}\n`);
  writeFileSync(quranPath, quran);
  const manifestPath = join(CONTENT, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.contentVersion += 1;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`contentVersion → ${manifest.contentVersion}`);
} else {
  console.log('Quranic text already matches the source.');
}

const { errors, warnings } = validateContent(CONTENT);
for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  process.exit(1);
}
console.log('Content is valid.');
