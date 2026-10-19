#!/usr/bin/env node
/**
 * Builds one book into content from its recipe (scripts/books/<book>.recipe.mjs):
 *
 *   node scripts/books/build-book.mjs hisn
 *
 * The recipe says, chapter by chapter, which source items to take and how; the text itself is copied
 * from the source (pick/parts match on plain letters), never retyped. Every thiker goes through the one
 * pool (athkar.json): if its letters already exist there it is reused, so a thiker shared by several
 * books or sections is stored once. Hadiths go to hadiths.json under "<book>-<n>" unless the recipe
 * points at a shared one. Re-running replaces this book and its own hadiths; other books are untouched.
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { CONTENT, citesSource, clean, gradeOf, moreVocalised, pick, plain, readJson, replacePlain, splitNote, writeJson } from './lib.mjs';
import { validateContent } from '../validate-content.mjs';

const bookId = process.argv[2];
if (!bookId) throw new Error('Usage: build-book.mjs <book>');
const recipe = (await import(pathToFileURL(join(import.meta.dirname, `${bookId}.recipe.mjs`)).href)).default;

const athkar = readJson('athkar.json');
const hadiths = readJson('hadiths.json');
const sections = readJson('sections.json').sections;
const manifest = readJson('manifest.json');
const report = { reused: [], created: [], upgraded: [], renamed: [] };

// This book's hadiths are rebuilt; the old ones are kept aside for the quotations other books added.
const previous = {};
for (const id of Object.keys(hadiths)) if (id.startsWith(`${bookId}-`)) { previous[id] = hadiths[id]; delete hadiths[id]; }

const byLetters = new Map();
const byAyahs = new Map();
const ayahKey = (a) => `${a.sura}:${a.from}-${a.to}`;
for (const [id, t] of Object.entries(athkar)) {
  if (t.ayahs) byAyahs.set(ayahKey(t.ayahs), id);
  else byLetters.set(plain(t.text), id);
}

const stripHarakat = (s) => s.replace(/[ً-ٰٟـ]/g, '');
const autoTitle = (text) => {
  const words = stripHarakat(clean(text)).replace(/[،:؛.]/g, '').split(' ');
  return words.slice(0, 6).join(' ') + (words.length > 6 ? '…' : '');
};

/** The one pool id for these words: an existing thiker with the same letters, or a new one. */
function poolId(spec, text, where) {
  if (spec.quran) {
    const found = byAyahs.get(ayahKey(spec.quran));
    if (found) { report.reused.push(found); return found; }
    const id = spec.id;
    if (athkar[id]) throw new Error(`${where}: id "${id}" is taken by other words`);
    athkar[id] = { title: spec.title, text: '', quran: true, ayahs: spec.quran, ...(spec.basmalah ? { basmalah: true } : {}) };
    byAyahs.set(ayahKey(spec.quran), id);
    report.created.push(id);
    return id;
  }
  const key = plain(text);
  const found = byLetters.get(key);
  if (found) {
    if (spec.id && spec.id !== found) report.renamed.push(`${where}: ${spec.id} → ${found}`);
    // Take this text when it carries more harakat, or — when the recipe wrote it out (text/derive) —
    // when it differs only in punctuation, so a corrected comma reaches the pool.
    const written = (spec.text || spec.derive) && text !== athkar[found].text && !moreVocalised(athkar[found].text, text);
    if (!athkar[found].quran && (moreVocalised(text, athkar[found].text) || written)) {
      athkar[found].text = text;
      report.upgraded.push(found);
    }
    report.reused.push(found);
    return found;
  }
  if (!spec.id) throw new Error(`${where}: new thiker needs an id — ${text.slice(0, 40)}`);
  if (athkar[spec.id]) throw new Error(`${where}: id "${spec.id}" is taken by other words:\n  pool: ${athkar[spec.id].text.slice(0, 80)}\n  here: ${text.slice(0, 80)}`);
  athkar[spec.id] = { title: spec.title ?? autoTitle(text), text };
  byLetters.set(key, spec.id);
  report.created.push(spec.id);
  return spec.id;
}

/** The hadith behind an entry: the recipe's shared one, or one built from the source item's footnotes. */
function hadithFor(spec, item, where) {
  if (spec.hadith === false) return undefined;
  if (typeof spec.hadith === 'string') {
    const shared = hadiths[spec.hadith];
    if (!shared) throw new Error(`${where}: hadith "${spec.hadith}" does not exist`);
    // A second book quoting the same narration adds its quotation if the first gave none.
    if (spec.hadithPick && !shared.text) shared.text = clean(pick(spec.raw ?? recipe.text, spec.hadithPick[0], spec.hadithPick[1], where));
    return spec.hadith;
  }
  const notes = Object.values(item?.notes ?? {}).filter((n) => !/^وإذا أمسى/.test(n.trim()) && !spec.skipNotes?.some((s) => n.includes(s)));
  let fadl;
  const sources = [];
  // Short glosses («أقر وأعترف» for «أبوء») explain a word; they are not the evidence.
  for (const n of notes.filter(citesSource)) {
    const part = splitNote(n);
    if (part.fadl && !fadl) fadl = part.fadl;
    if (!sources.includes(part.source)) sources.push(part.source);
  }
  const source = spec.source ?? sources.join(' ؛ ');
  if (!source) return undefined;
  const h = { source };
  if (spec.hadithText) h.text = spec.hadithText === true ? clean(item.raw) : spec.hadithText;
  // The narration as the book quotes it, taken from the book's own text.
  if (spec.hadithPick) h.text = clean(pick(spec.raw ?? recipe.text, spec.hadithPick[0], spec.hadithPick[1], where));
  const f = spec.fadl === null ? undefined : spec.fadl ?? fadl;
  if (f) h.fadl = f;
  const g = spec.grade ? { grade: spec.grade, gradeNote: spec.gradeNote } : gradeOf(source);
  if (g.grade) h.grade = g.grade;
  if (g.gradeNote) h.gradeNote = g.gradeNote;
  const id = `${bookId}-${spec.hid ?? item?.n ?? where.replace(/\W+/g, '-')}`;
  // Keep a quotation a later book gave this narration (see above), so a rebuild of this book alone is a no-op.
  if (!h.text && previous[id]?.text) h.text = previous[id].text;
  hadiths[id] = h;
  return id;
}

function textOf(spec, raw, where) {
  if (spec.text) return spec.text;
  if (spec.derive) {
    // Another wording of a thiker already in the pool: its vocalised text with words swapped.
    const base = athkar[spec.derive.from];
    if (!base) throw new Error(`${where}: derive.from "${spec.derive.from}" does not exist`);
    return spec.derive.replace.reduce((t, [a, b]) => replacePlain(t, a, b, where), base.text);
  }
  if (spec.parts) return spec.parts.map(([a, b]) => clean(pick(raw, a, b, where))).join(spec.join ?? ' ');
  if (spec.pick) return clean(pick(raw, spec.pick[0], spec.pick[1], where));
  return clean(raw);
}

const chapters = [];
for (const [ci, ch] of recipe.chapters.entries()) {
  const src = recipe.chapter?.(ch.from);
  const title = ch.title ?? stripHarakat(src?.title ?? '');
  for (const sid of ch.sections ?? []) if (!sections[sid]) throw new Error(`chapter ${ci + 1}: unknown section ${sid}`);
  const entries = [];
  for (const spec of ch.entries) {
    const item = spec.n !== undefined ? recipe.item(spec.n) : undefined;
    const where = `${title} #${spec.n ?? entries.length + 1}`;
    if (spec.n !== undefined && !item) throw new Error(`${where}: no such item in the source`);
    const raw = spec.raw ?? item?.raw ?? '';
    const hadith = hadithFor(spec, item, where);
    if (spec.guide !== undefined || spec.guidePick) {
      const guide = spec.guide ?? clean(pick(raw, spec.guidePick[0], spec.guidePick[1], where));
      entries.push({ guide, ...(hadith ? { hadith } : {}) });
      continue;
    }
    let id;
    let text = '';
    if (spec.ref) {
      if (!athkar[spec.ref]) throw new Error(`${where}: ref "${spec.ref}" does not exist`);
      id = spec.ref;
      text = athkar[id].text;
    } else {
      text = spec.quran ? '' : textOf(spec, raw, where);
      id = poolId(spec, text, where);
    }
    const e = { id };
    if (spec.num > 1) e.num = spec.num;
    if (hadith) e.hadith = hadith;
    // A shared hadith keeps its own virtue; this book's wording of it goes on the entry.
    const ownFadl = spec.entryFadl ?? (typeof spec.hadith === 'string' ? spec.fadl : undefined);
    if (ownFadl) e.fadl = ownFadl;
    if (spec.note) e.note = spec.note;
    if (spec.evening) {
      // A morning thiker with its evening wording (أصبحنا → أمسينا) given as replacements.
      let evening = text;
      for (const [a, b] of spec.evening) evening = replacePlain(evening, a, b, `${where} (evening)`);
      e.only = 'morning';
      entries.push(e);
      const eid = poolId({ id: spec.eveningId, title: spec.eveningTitle }, evening, `${where} (evening)`);
      entries.push({ ...e, id: eid, only: 'evening' });
      continue;
    }
    if (spec.only) e.only = spec.only;
    entries.push(e);
  }
  chapters.push({ title, ...(ch.sections?.length ? { sections: ch.sections } : {}), entries });
}

// Write only what changed, and bump contentVersion only then, so a rebuild of the same sources is a no-op.
let changed = false;
const put = (p, v) => {
  let before;
  try { before = JSON.stringify(readJson(p)); } catch { /* new file */ }
  if (before === JSON.stringify(v)) return;
  writeJson(p, v);
  changed = true;
};
put(`books/${bookId}.json`, { title: recipe.title, author: recipe.author, source: recipe.source, chapters });
put('athkar.json', athkar);
put('hadiths.json', Object.fromEntries(Object.entries(hadiths).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))));
if (!manifest.books.includes(bookId)) { manifest.books.push(bookId); changed = true; }
if (changed) {
  manifest.contentVersion += 1;
  writeJson('manifest.json', manifest);
}

console.log(`${bookId}: ${chapters.length} chapters, ${chapters.reduce((n, c) => n + c.entries.length, 0)} entries`);
console.log(`  new athkar: ${report.created.length}, reused: ${new Set(report.reused).size}, better harakat: ${report.upgraded.length}`);
for (const r of report.renamed) console.log(`  same words as an existing thiker: ${r}`);
if (report.upgraded.length) console.log(`  harakat taken from this book: ${report.upgraded.join(', ')}`);

// New Quranic athkar get their text from the KFGQPC source.
execFileSync(process.execPath, [join(import.meta.dirname, '..', 'quran-text.mjs')], { stdio: 'pipe' });

const { errors, warnings } = validateContent(CONTENT);
for (const w of warnings) console.warn(`warning: ${w}`);
for (const e of errors) console.error(`error: ${e}`);
if (errors.length) process.exit(1);
