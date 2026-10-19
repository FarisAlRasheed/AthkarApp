// Shared tools for turning a Turath book into content: matching athkar by their letters, picking text
// out of the source without retyping it, and reading a footnote's source and grade.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CONTENT = join(ROOT, 'content');
export const readJson = (p) => JSON.parse(readFileSync(join(CONTENT, p), 'utf8'));
export const writeJson = (p, v) => writeFileSync(join(CONTENT, p), `${JSON.stringify(v, null, 2)}\n`);

const HARAKAT = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/;

/** One letter in its plain form: no harakat, one alif, one ya, ha for ta marbuta. */
function plainChar(c) {
  if (HARAKAT.test(c)) return '';
  if ('أإآٱ'.includes(c)) return 'ا';
  if (c === 'ى') return 'ي';
  if (c === 'ة') return 'ه';
  if (c === 'ؤ') return 'و';
  if (c === 'ئ') return 'ي';
  if (/[ء-ي0-9]/.test(c)) return c;
  return ' ';
}

/** The letters of a text with its harakat, punctuation and spacing dropped — what «same thiker» compares. */
export function plain(text) {
  return text
    // «ألّا» is «أن لا» written joined.
    .replace(/\u0623\u064E?\u0644(?:\u0651\u064E?|\u064E\u0651)\u0627(?=[\s،]|$)/g, 'أن لا')
    .replace(/ﷺ/g, ' صلى الله عليه وسلم ')
    .replace(/ﷻ/g, ' جل جلاله ')
    .split('')
    .map(plainChar)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The plain form plus, for each plain character, where it came from in the original. */
function plainWithMap(text) {
  let out = '';
  const map = [];
  for (let i = 0; i < text.length; i++) {
    const p = plainChar(text[i]);
    if (!p) continue;
    if (p === ' ' && (out.endsWith(' ') || out === '')) continue;
    out += p;
    map.push(i);
  }
  return { out, map };
}

/**
 * The original text from the first `from` to the end of the next `to`, matched on plain letters, so
 * the keys can be written without harakat and the vocalised source is copied, never retyped.
 */
export function pick(text, from, to, where) {
  const { out, map } = plainWithMap(text);
  const a = out.indexOf(plain(from));
  if (a < 0) throw new Error(`${where}: "${from}" not found`);
  const tp = plain(to ?? from);
  const b = to ? out.indexOf(tp, a) : a;
  if (b < 0) throw new Error(`${where}: "${to}" not found after "${from}"`);
  const end = map[b + tp.length - 1];
  // Take the harakat that sit on the last letter.
  let e = end + 1;
  while (e < text.length && HARAKAT.test(text[e])) e++;
  return text.slice(map[a], e);
}

/** Every occurrence of `from` (matched on plain letters) replaced by `to`, written out in full. */
export function replacePlain(text, from, to, where) {
  let out = text;
  let count = 0;
  for (;;) {
    let found;
    try { found = pick(out, from, undefined, where); } catch { break; }
    const { out: p, map } = plainWithMap(out);
    const a = map[p.indexOf(plain(from))];
    out = out.slice(0, a) + to + out.slice(a + found.length);
    if (++count > 20) throw new Error(`${where}: replacing "${from}" does not end`);
    if (plain(to).includes(plain(from))) break;
  }
  if (!count) throw new Error(`${where}: "${from}" not found`);
  return out;
}

/** A thiker's words as the app shows them: no footnote marks, quotes or editor's brackets. */
export function clean(text) {
  return text
    .replace(/⟦\d+:\d+⟧/g, '')
    .replace(/\s*\(\^[٠-٩]+\)/g, '')
    // «*» separates verses inside the source's ﴿…﴾ quotes.
    .replace(/\s*\*\s*/g, ' ')
    .replace(/[«»]/g, '')
    .replace(/\[|\]/g, '')
    .replace(/\s*-\s*ﷺ\s*-\s*/g, ' ﷺ ')
    .replace(/\s+([،.:؛])/g, '$1')
    .replace(/([،:؛])(?=[^\s\d])/g, '$1 ')
    .replace(/\s+/g, ' ')
    .replace(/[\s.،]+$/, '')
    .trim();
}

const harakatCount = (s) => [...s].filter((c) => HARAKAT.test(c)).length;
export const moreVocalised = (a, b) => harakatCount(a) > harakatCount(b);

// Where a takhrij starts: «أخرجه…», or a collection's name followed by its volume, number or «مع الفتح».
const SOURCE_START = /(أخرجه|أخرج |رواه|انظر:|(?:البخاري|مسلم|أبو داود|الترمذي|النسائي|ابن ماجه|أحمد|الحاكم|ابن السني|ابن حبان|الطبراني|البيهقي|مالك|الموطأ|ابن خزيمة|الدارمي|البغوي|سنن أبي داود|مسند أحمد|أهل السنن|أصحاب السنن)(?=،? ?(?:[٠-٩]|مع الفتح|برقم|في |بلفظه|وصححه|وغيره|واللفظ|بإسناد|بسند|وحسنه|:)))/;

/** Whether a footnote cites where a narration is (rather than explaining a word). */
export const citesSource = (note) => SOURCE_START.test(note) || /(متفق عليه|سورة|الآية|موقوف|مرفوع)/.test(note);

/** A footnote split into the virtue it states (if any) and its takhrij. */
export function splitNote(note) {
  // «سورة البقرة، الآية: ٢٥٥.» only names the verse, which the thiker already carries.
  const n = note.replace(/\s+/g, ' ').trim().replace(/^سورة [^.]+?الآ?ي[^.]*?[٠-٩]+\.\s*/, '');
  const m = n.match(SOURCE_START);
  if (!m || m.index < 12) return { source: n };
  return { fadl: tidyFadl(n.slice(0, m.index)), source: n.slice(m.index) };
}

/** A virtue as a sentence: no quote marks, «الحديث» or dots left from the footnote. */
export function tidyFadl(s) {
  return s
    .replace(/\s*-\s*ﷺ\s*-\s*/g, ' ﷺ ')
    .replace(/[«»]/g, '')
    .replace(/\s*\.{2,}\s*(الحديث)?\s*\.*\s*/g, ' … ')
    .replace(/\s+/g, ' ')
    .replace(/[\s،.:…]+$/, '')
    .trim();
}

// Who graded it, most authoritative for this app first: the first name in a footnote is often
// just one of the collections that narrate it.
const GRADERS = [['الألباني', 'الألباني'], ['ابن باز', 'ابن باز'], ['الحافظ', 'ابن حجر'], ['ابن حجر', 'ابن حجر'], ['الأرناؤوط', 'الأرناؤوط'], ['شعيب', 'الأرناؤوط'], ['الحاكم', 'الحاكم']];
const grader = (s) => GRADERS.find(([k]) => s.includes(k))?.[1];

/** The grade a takhrij states outright; nothing when it only points to where to look. */
export function gradeOf(source) {
  const s = source.replace(/[ً-ٰٟ]/g, '').replace(/صحيح (مسلم|البخاري)/g, '$1');
  if ((/(^|[\s،:])(البخاري|مسلم)(?=[،\s.]|$)/.test(s) || /متفق عليه/.test(s)) && !/(موقوف|معلق)/.test(s)) return { grade: 'صحيح' };
  if (/(موقوف|من قول|من كلام)/.test(s)) {
    const isSahih = /(صحيح|صحح)/.test(s);
    return isSahih ? { grade: 'صحيح', gradeNote: 'موقوف' } : {};
  }
  if (/حسن/.test(s)) {
    const who = grader(s);
    return { grade: 'حسن', gradeNote: who ? `حسّنه ${who}` : undefined };
  }
  if (/(صححه|وصحح|صحح إسناده|بإسناد صحيح|إسناده صحيح|حديث صحيح|بسند صحيح|إسناد صحيح|صحيح الإسناد)/.test(s)) {
    const who = grader(s);
    return { grade: 'صحيح', gradeNote: who ? `صححه ${who}` : undefined };
  }
  if (/جيد/.test(s)) return { grade: 'حسن', gradeNote: 'إسناده جيد' };
  return {};
}

/** A lowercase-kebab id not yet taken. */
export function freeId(base, taken) {
  let id = base;
  for (let i = 2; taken(id); i++) id = `${base}-${i}`;
  return id;
}
