#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const GRADES = ['صحيح', 'حسن', 'ضعيف', 'موضوع'];
export const RESET_POINTS = ['fajr', 'asr', 'isha', 'each-prayer'];
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const THIKR_KEYS = new Set(['title', 'text', 'quran', 'translations']);
const ENTRY_KEYS = new Set(['id', 'num', 'fadl', 'evidence']);
const EVIDENCE_KEYS = new Set(['text', 'source', 'grade', 'gradeNote']);

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
    collections: read('collections.json'),
    books,
    reciters: read('reciters.json'),
    tasbih: read('tasbih.json'),
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
  const { manifest, athkar, collections, books, reciters, tasbih } = content;

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
    if (t.translations !== undefined) {
      for (const [lang, tr] of Object.entries(t.translations)) {
        if (!isNonEmptyString(tr)) errors.push(`${at}: translation "${lang}" is empty`);
      }
    }
  }

  for (const [id, c] of Object.entries(collections)) {
    if (!isNonEmptyString(c.title)) errors.push(`collections/${id}: title is required`);
    if (!RESET_POINTS.includes(c.resetAt)) errors.push(`collections/${id}: resetAt must be one of ${RESET_POINTS.join(', ')}`);
  }

  for (const bookId of manifest.books ?? []) {
    if (!ID_PATTERN.test(bookId)) errors.push(`manifest: book id "${bookId}" must be lowercase-kebab`);
    if (!(bookId in books)) errors.push(`books/${bookId}.json is listed in the manifest but missing`);
  }
  for (const bookId of Object.keys(books)) {
    if (!manifest.books?.includes(bookId)) errors.push(`books/${bookId}: not listed in the manifest`);
  }

  const used = new Set();
  for (const [bookId, book] of Object.entries(books)) {
    const at = `books/${bookId}`;
    if (!book) { errors.push(`${at}.json is listed in the manifest but missing`); continue; }
    if (!isNonEmptyString(book.name)) errors.push(`${at}: name is required`);
    for (const [colId, entries] of Object.entries(book.collections ?? {})) {
      if (!collections[colId]) errors.push(`${at}: unknown collection "${colId}"`);
      const seen = new Set();
      entries.forEach((e, i) => {
        const where = `${at}/${colId}[${i + 1}]`;
        for (const k of Object.keys(e)) if (!ENTRY_KEYS.has(k)) errors.push(`${where}: unknown field "${k}"`);
        if (!athkar[e.id]) errors.push(`${where}: thiker "${e.id}" does not exist`);
        if (!isPositiveInt(e.num)) errors.push(`${where}: num must be a whole number ≥ 1`);
        if (e.fadl !== undefined && !isNonEmptyString(e.fadl)) errors.push(`${where}: fadl is empty`);
        if (e.evidence !== undefined) {
          for (const k of Object.keys(e.evidence)) if (!EVIDENCE_KEYS.has(k)) errors.push(`${where}: unknown evidence field "${k}"`);
          if (e.evidence.grade !== undefined && !GRADES.includes(e.evidence.grade)) {
            errors.push(`${where}: grade must be one of ${GRADES.join('، ')}`);
          }
        }
        // The same thiker twice with different counts is legitimate (e.g. tahleel ×10 and ×100).
        const key = `${e.id}×${e.num}`;
        if (seen.has(key)) warnings.push(`${where}: "${e.id}" ×${e.num} appears twice in this list`);
        seen.add(key);
        used.add(e.id);
      });
    }
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
