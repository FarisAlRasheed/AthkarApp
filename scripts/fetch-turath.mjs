#!/usr/bin/env node
// Downloads a Turath book page by page into content/sources/turath/<book>.json (raw source for the build scripts).
// Usage: node scripts/fetch-turath.mjs <bookId> <firstPage> <lastPage>
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [bookId, first, last] = process.argv.slice(2).map(Number);
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'sources', 'turath', `${bookId}.json`);
const pages = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};
for (let pg = first; pg <= last; pg++) {
  if (pages[pg]) continue;
  const res = await fetch(`https://api.turath.io/page?book_id=${bookId}&pg=${pg}&ver=3`);
  if (!res.ok) { console.warn(`page ${pg}: HTTP ${res.status}`); continue; }
  const body = await res.json();
  if (!body.text) { console.warn(`page ${pg}: empty`); continue; }
  pages[pg] = { meta: JSON.parse(body.meta), text: body.text };
  await new Promise((r) => setTimeout(r, 250));
}
writeFileSync(out, JSON.stringify(pages, null, 1));
console.log(`${bookId}: ${Object.keys(pages).length} pages`);
