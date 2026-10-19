#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const GRADES = ['صحيح', 'حسن', 'ضعيف', 'موضوع'];
export const RESET_POINTS = ['fajr', 'asr', 'isha', 'each-prayer'];
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const THIKR_KEYS = new Set(['title', 'text', 'quran', 'ayahs', 'basmalah', 'translations']);
export const KINDS = ['wird', 'list'];
const ENTRY_KEYS = new Set(['id', 'num', 'hadith', 'fadl', 'note', 'only', 'guide']);
const HADITH_KEYS = new Set(['text', 'fadl', 'source', 'grade', 'gradeNote']);
const BOOK_KEYS = new Set(['title', 'author', 'source', 'chapters']);
const CHAPTER_KEYS = new Set(['title', 'sections', 'entries']);

const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';
const isPositiveInt = (v) => Number.isInteger(v) && v >= 1;

export function loadContent(dir) {
  const read = (p) => JSON.parse(readFileSync(join(dir, p), 'utf8'));
  const manifest = read('manifest.json');
  const books = {};
  for (const bookId of manifest.books ?? []) {
    const file = join('books', `${bookId}.json`);
    books[bookId] = existsSync(join(dir, file)) ? read(file) : null;
  }
  return {
    manifest,
    athkar: read('athkar.json'),
    hadiths: read('hadiths.json'),
    sections: read('sections.json'),
    books,
    reciters: read('reciters.json'),
    tasbih: read('tasbih.json'),
    calendar: existsSync(join(dir, 'calendar.json')) ? read('calendar.json') : { days: {} },
  };
}

export function validateContent(dir) {
  let content;
  try {
    content = loadContent(dir);
  } catch (e) {
    return { errors: [`Cannot read content: ${e.message}`], warnings: [] };
  }
  return validateData(content, join(dir, 'audio'));
}

export function validateData(content, audioRoot, pendingDeletes = new Set()) {
  const errors = [];
  const warnings = [];
  const { manifest, athkar, hadiths, books, reciters, tasbih } = content;
  const { groups = {}, sections = {} } = content.sections;

  if (!Number.isInteger(manifest.schemaVersion)) errors.push('manifest: schemaVersion must be an integer');
  if (!Number.isInteger(manifest.contentVersion)) errors.push('manifest: contentVersion must be an integer');
  if (!manifest.books?.includes(manifest.defaultBook)) errors.push(`manifest: defaultBook "${manifest.defaultBook}" is not in books`);

  for (const [id, t] of Object.entries(athkar)) {
    const at = `athkar/${id}`;
    if (!ID_PATTERN.test(id)) errors.push(`${at}: id must be lowercase-kebab`);
    for (const k of Object.keys(t)) if (!THIKR_KEYS.has(k)) errors.push(`${at}: unknown field "${k}"`);
    if (!isNonEmptyString(t.title)) errors.push(`${at}: title is required`);
    if (!isNonEmptyString(t.text)) errors.push(`${at}: text is required`);
    if (t.quran !== undefined && typeof t.quran !== 'boolean') errors.push(`${at}: quran must be true/false`);
    if (t.ayahs !== undefined) {
      const { sura, from, to } = t.ayahs;
      if (t.quran !== true) errors.push(`${at}: ayahs is only for Quranic athkar (quran: true)`);
      if (!(isPositiveInt(sura) && sura <= 114 && isPositiveInt(from) && isPositiveInt(to) && from <= to)) {
        errors.push(`${at}: ayahs must be { sura: 1–114, from, to } with from ≤ to`);
      }
    } else if (t.quran === true) {
      warnings.push(`${at}: Quranic text without ayahs — add ayahs and run npm run content:quran`);
    }
    if (t.basmalah !== undefined && (t.basmalah !== true || !t.ayahs)) errors.push(`${at}: basmalah must be true and needs ayahs`);
    if (t.translations !== undefined) {
      for (const [lang, tr] of Object.entries(t.translations)) {
        if (!isNonEmptyString(tr)) errors.push(`${at}: translation "${lang}" is empty`);
      }
    }
  }

  for (const [id, c] of Object.entries(sections)) {
    const at = `sections/${id}`;
    if (!ID_PATTERN.test(id)) errors.push(`${at}: id must be lowercase-kebab`);
    if (!isNonEmptyString(c.title)) errors.push(`${at}: title is required`);
    if (!groups[c.group]) errors.push(`${at}: unknown group "${c.group}"`);
    if (!KINDS.includes(c.kind)) errors.push(`${at}: kind must be one of ${KINDS.join(', ')}`);
    if (c.kind === 'wird' && !RESET_POINTS.includes(c.resetAt)) errors.push(`${at}: a wird needs resetAt (${RESET_POINTS.join(', ')})`);
    if (c.kind !== 'wird' && c.resetAt !== undefined) errors.push(`${at}: only a wird resets`);
    if (c.opening !== undefined) {
      const a = c.opening.ayahs ?? {};
      if (!(isPositiveInt(a.sura) && a.sura <= 114 && isPositiveInt(a.from) && isPositiveInt(a.to) && a.from <= a.to)) {
        errors.push(`${at}: opening.ayahs must be { sura: 1–114, from, to } with from ≤ to`);
      }
      if (!isNonEmptyString(c.opening.text)) errors.push(`${at}: opening.text is empty — run npm run content:quran`);
    }
  }
  for (const g of Object.keys(groups)) {
    if (!Object.values(sections).some((c) => c.group === g)) warnings.push(`sections: group "${g}" has no sections`);
  }

  for (const [id, h] of Object.entries(hadiths)) {
    const at = `hadiths/${id}`;
    if (!ID_PATTERN.test(id)) errors.push(`${at}: id must be lowercase-kebab`);
    for (const k of Object.keys(h)) if (!HADITH_KEYS.has(k)) errors.push(`${at}: unknown field "${k}"`);
    for (const k of HADITH_KEYS) if (h[k] !== undefined && !isNonEmptyString(h[k])) errors.push(`${at}: ${k} is empty`);
    if (!h.source) errors.push(`${at}: source is required`);
    if (h.grade !== undefined && !GRADES.includes(h.grade)) errors.push(`${at}: grade must be one of ${GRADES.join('، ')}`);
    // Weak and fabricated narrations are kept out of the app for now.
    if (h.grade === 'ضعيف' || h.grade === 'موضوع') errors.push(`${at}: graded ${h.grade} — weak narrations are not included`);
  }

  for (const bookId of manifest.books ?? []) {
    if (!ID_PATTERN.test(bookId)) errors.push(`manifest: book id "${bookId}" must be lowercase-kebab`);
    if (!(bookId in books)) errors.push(`books/${bookId}.json is listed in the manifest but missing`);
  }
  for (const bookId of Object.keys(books)) {
    if (!manifest.books?.includes(bookId)) errors.push(`books/${bookId}: not listed in the manifest`);
  }

  const used = new Set();
  const usedHadiths = new Set();
  for (const [bookId, book] of Object.entries(books)) {
    const at = `books/${bookId}`;
    if (!book) { errors.push(`${at}.json is listed in the manifest but missing`); continue; }
    for (const k of Object.keys(book)) if (!BOOK_KEYS.has(k)) errors.push(`${at}: unknown field "${k}"`);
    if (!isNonEmptyString(book.title) && !isNonEmptyString(book.author)) errors.push(`${at}: title or author is required`);
    if (!book.chapters?.length) errors.push(`${at}: needs at least one chapter`);
    const seen = {};
    (book.chapters ?? []).forEach((ch, ci) => {
      const cat = `${at}/chapters[${ci + 1}]`;
      for (const k of Object.keys(ch)) if (!CHAPTER_KEYS.has(k)) errors.push(`${cat}: unknown field "${k}"`);
      if (!isNonEmptyString(ch.title)) errors.push(`${cat}: title is required`);
      for (const sid of ch.sections ?? []) if (!sections[sid]) errors.push(`${cat}: unknown section "${sid}"`);
      if (!ch.entries?.length) errors.push(`${cat}: needs at least one entry`);
      (ch.entries ?? []).forEach((e, i) => {
        const where = `${cat}[${i + 1}]`;
        for (const k of Object.keys(e)) if (!ENTRY_KEYS.has(k)) errors.push(`${where}: unknown field "${k}"`);
        const inWird = (ch.sections ?? []).some((sid) => sections[sid]?.kind === 'wird' && (!e.only || e.only === sid));
        if (e.guide !== undefined) {
          // A line of guidance (what to do, not words to say) — shown in reading lists, never counted.
          if (e.id !== undefined || e.num !== undefined) errors.push(`${where}: a guide has no id or num`);
          if (!isNonEmptyString(e.guide)) errors.push(`${where}: guide is empty`);
          if (inWird) errors.push(`${where}: a wird cannot hold a guide`);
        } else {
          if (!athkar[e.id]) errors.push(`${where}: thiker "${e.id}" does not exist`);
          used.add(e.id);
        }
        if (e.num !== undefined && !(isPositiveInt(e.num) && e.num > 1)) errors.push(`${where}: num is a whole number > 1 (leave it out for once)`);
        if (e.hadith !== undefined) {
          if (!hadiths[e.hadith]) errors.push(`${where}: hadith "${e.hadith}" does not exist`);
          usedHadiths.add(e.hadith);
        }
        for (const k of ['fadl', 'note']) if (e[k] !== undefined && !isNonEmptyString(e[k])) errors.push(`${where}: ${k} is empty`);
        if (e.only !== undefined && !(ch.sections ?? []).includes(e.only)) errors.push(`${where}: only "${e.only}" is not one of this chapter's sections`);
        // In a wird, the same thiker twice with the same count is almost always a slip
        // (twice with different counts is legitimate: Ibn Baz lists the tahleel ×10 and ×100).
        for (const sid of ch.sections ?? []) {
          if (e.id === undefined || (e.only && e.only !== sid) || sections[sid]?.kind !== 'wird') continue;
          const key = `${sid}/${e.id}×${e.num ?? 1}`;
          if (seen[key]) warnings.push(`${where}: "${e.id}" ×${e.num ?? 1} appears twice in ${sid}`);
          seen[key] = true;
        }
      });
    });
  }
  for (const id of Object.keys(hadiths)) {
    if (!usedHadiths.has(id)) warnings.push(`hadiths/${id}: not used by any book`);
  }

  for (const id of Object.keys(athkar)) {
    if (!used.has(id)) warnings.push(`athkar/${id}: not used by any book`);
  }

  const audioDirs = existsSync(audioRoot) ? readdirSync(audioRoot).filter((f) => !f.startsWith('.')) : [];
  for (const d of audioDirs) {
    if (!reciters[d]) errors.push(`audio/${d}: folder has no entry in reciters.json`);
  }
  for (const [rid, r] of Object.entries(reciters)) {
    const at = `reciters/${rid}`;
    if (!ID_PATTERN.test(rid)) errors.push(`${at}: id must be lowercase-kebab`);
    if (!isNonEmptyString(r.name)) errors.push(`${at}: name is required`);
    const recorded = new Set(r.recorded ?? []);
    for (const id of recorded) {
      if (!athkar[id]) errors.push(`${at}: recorded "${id}" does not exist`);
      if (!existsSync(join(audioRoot, rid, `${id}.m4a`))) errors.push(`${at}: audio/${rid}/${id}.m4a is missing`);
    }
    const folder = join(audioRoot, rid);
    if (existsSync(folder)) {
      for (const f of readdirSync(folder).filter((f) => !f.startsWith('.'))) {
        if (pendingDeletes.has(join(rid, f))) continue;
        if (!recorded.has(basename(f, '.m4a'))) errors.push(`audio/${rid}/${f}: file is not listed in reciters.json`);
      }
    }
  }

  const phraseIds = new Set();
  for (const [i, p] of (tasbih.phrases ?? []).entries()) {
    const at = `tasbih/phrases[${i + 1}]`;
    if (!ID_PATTERN.test(p.id ?? '')) errors.push(`${at}: id must be lowercase-kebab`);
    if (phraseIds.has(p.id)) errors.push(`${at}: duplicate id "${p.id}"`);
    phraseIds.add(p.id);
    if (!isNonEmptyString(p.text)) errors.push(`${at}: text is required`);
    if (!isPositiveInt(p.target)) errors.push(`${at}: target must be a whole number ≥ 1`);
  }

  for (const [i, s] of (tasbih.sequences ?? []).entries()) {
    const at = `tasbih/sequences[${i + 1}]`;
    if (!ID_PATTERN.test(s.id ?? '')) errors.push(`${at}: id must be lowercase-kebab`);
    if (!isNonEmptyString(s.title)) errors.push(`${at}: title is required`);
    if (!s.steps?.length) errors.push(`${at}: needs at least one step`);
    for (const [j, step] of (s.steps ?? []).entries()) {
      if (!phraseIds.has(step.phrase)) errors.push(`${at}/steps[${j + 1}]: phrase "${step.phrase}" does not exist`);
      if (!isPositiveInt(step.count)) errors.push(`${at}/steps[${j + 1}]: count must be a whole number ≥ 1`);
    }
  }

  // Special days (DESIGN_PLAN §8): texts for the home card, optionally opening the tasbih on a phrase.
  for (const [id, d] of Object.entries(content.calendar?.days ?? {})) {
    const at = `calendar/${id}`;
    if (!isNonEmptyString(d.title) || !isNonEmptyString(d.text)) errors.push(`${at}: title and text are required`);
    if (d.tasbih !== undefined && !phraseIds.has(d.tasbih)) errors.push(`${at}: tasbih phrase "${d.tasbih}" does not exist`);
  }

  return { errors, warnings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'content');
  const { errors, warnings } = validateContent(dir);
  for (const w of warnings) console.warn(`warning: ${w}`);
  for (const e of errors) console.error(`error: ${e}`);
  console.log(errors.length ? `✗ ${errors.length} error(s)` : `✓ content is valid (${warnings.length} warning(s))`);
  process.exit(errors.length ? 1 : 0);
}
