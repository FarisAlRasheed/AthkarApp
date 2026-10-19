#!/usr/bin/env node
// Splits حصن المسلم (Turath 31307) into chapters and numbered items, each with its footnotes.
// Output: content/sources/turath/31307.parsed.json — the raw material the book build reads.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'content', 'sources', 'turath');
const pages = JSON.parse(readFileSync(join(root, '31307.json'), 'utf8'));
const num = (s) => Number(s.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

const chapters = [];
let chapter = null;
let item = null;

for (const pg of Object.keys(pages).map(Number).sort((a, b) => a - b)) {
  const [body, foot = ''] = pages[pg].text.split('\n_________\n');
  // Footnotes: "(n) text", continuation lines join the previous note.
  const notes = {};
  let last = null;
  for (const line of foot.split('\n')) {
    const m = line.match(/^\(([٠-٩]+)\)\s*(.*)$/);
    if (m) { last = num(m[1]); notes[last] = m[2]; } else if (last && line.trim()) notes[last] += ' ' + line.trim();
  }
  const ref = (s) => s.replace(/\s*\(([٠-٩]+)\)/g, (_, n) => (notes[num(n)] ? `⟦${pg}:${num(n)}⟧` : _));
  const lines = body.split('\n');
  for (let line of lines) {
    const title = line.match(/<span data-type="title"[^>]*>(.*?)<\/span>/);
    if (title) {
      const t = title[1].match(/^([٠-٩]+) - (.*)$/);
      chapter = { n: t ? num(t[1]) : 0, title: t ? t[2] : title[1], page: pg, items: [], intro: '' };
      chapters.push(chapter);
      item = null;
      continue;
    }
    if (!chapter) continue;
    const m = line.match(/^([٠-٩]+) - (?:\(([٠-٩]+)\) )?(.*)$/);
    // Items are numbered through the whole book, so a smaller number is a chapter heading the
    // source left unmarked (١٢١ - التكبير عند رمي الجمار).
    if (m && item && num(m[1]) < item.n) {
      chapter = { n: num(m[1]), title: m[3], page: pg, items: [], intro: '' };
      chapters.push(chapter);
      item = null;
      continue;
    }
    if (m) {
      item ={ n: num(m[1]), sub: m[2] ? num(m[2]) : undefined, page: pg, raw: ref(m[3]) };
      chapter.items.push(item);
    } else if (item) item.raw += (item.raw.endsWith(' ') ? '' : ' ') + ref(line).trim();
    else chapter.intro += ref(line).trim() + ' ';
  }
  // Attach this page's notes to whatever references them.
  for (const c of chapters) for (const it of [...c.items, { raw: c.intro, notes: (c.introNotes ??= {}) }]) {
    it.notes ??= {};
    for (const [, p, n] of it.raw.matchAll(/⟦(\d+):(\d+)⟧/g)) if (Number(p) === pg) it.notes[`${p}:${n}`] = notes[n];
  }
}
for (const c of chapters) { c.intro = c.intro.trim(); for (const it of c.items) it.raw = it.raw.replace(/\s+/g, ' ').trim(); }
writeFileSync(join(root, '31307.parsed.json'), JSON.stringify(chapters, null, 1));
console.log(chapters.length, 'chapters,', chapters.reduce((s, c) => s + c.items.length, 0), 'items');
