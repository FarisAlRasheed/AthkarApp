#!/usr/bin/env node
// One-time conversion of data/ (web app format) into content/ (app format, see APP_PLAN.md §4).
// Refuses to overwrite content/ unless --force, because content/ becomes the edited source of truth.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateContent } from './validate-content.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');
const VOICES = join(ROOT, 'voices');
const OUT = join(ROOT, 'content');
const RECITER = { id: 'faris-alrasheed', name: 'فارس بن تركي الرشيد' };
const BOOK_IDS = { ibn_baz: 'baz', ibn_uthaymeen: 'uthaymeen' };

// [id, title, isQuran, source keys]. Keys are "<collection>:<pool key or list index>".
// Several keys on one id = the same thiker stored more than once in the old data.
const ATHKAR = [
  ['baqarah-opening', 'أول سورة البقرة', true, ['morning:m_001', 'evening:e_001']],
  ['ayat-al-kursi', 'آية الكرسي', true, ['morning:m_002', 'evening:e_002', 'post-prayer:7', 'sleep:0']],
  ['baqarah-ending', 'خواتيم سورة البقرة', true, ['morning:m_003', 'evening:e_003', 'sleep:1']],
  ['ghafir-opening', 'أول سورة غافر', true, ['morning:m_004', 'evening:e_004']],
  ['hashr-ending', 'خواتيم سورة الحشر', true, ['morning:m_005', 'evening:e_005']],
  ['al-ikhlas', 'سورة الإخلاص', true, ['morning:m_006', 'evening:e_006', 'sleep:2']],
  ['al-falaq', 'سورة الفلق', true, ['morning:m_007', 'evening:e_007', 'sleep:3']],
  ['an-nas', 'سورة الناس', true, ['morning:m_008', 'evening:e_008', 'sleep:4']],
  ['kalimat-allah', 'أعوذ بكلمات الله التامات', false, ['morning:m_009', 'evening:e_009']],
  ['bismillah-la-yadurr', 'بسم الله الذي لا يضر مع اسمه شيء', false, ['morning:m_010', 'evening:e_010']],
  ['raditu-billah', 'رضيت بالله ربًّا', false, ['morning:m_011', 'evening:e_011']],
  ['asbahna-almulk', 'أصبحنا وأصبح الملك لله', false, ['morning:m_012_uthaymeen_1']],
  ['asbahna-almulk-long', 'أصبحنا وأصبح الملك لله', false, ['morning:baz_024']],
  ['amsayna-almulk-long', 'أمسينا وأمسى الملك لله', false, ['evening:e_012_uthaymeen_1', 'evening:baz_024']],
  ['khayra-hadha-alyawm', 'رب أسألك خير ما في هذا اليوم', false, ['morning:m_012_uthaymeen_2']],
  ['bika-asbahna', 'اللهم بك أصبحنا', false, ['morning:m_013']],
  ['bika-amsayna', 'اللهم بك أمسينا', false, ['evening:e_013']],
  ['ma-asbaha-bi', 'اللهم ما أصبح بي من نعمة', false, ['morning:m_014']],
  ['ma-amsa-bi', 'اللهم ما أمسى بي من نعمة', false, ['evening:e_014']],
  ['asbahtu-fi-nimah', 'اللهم إني أصبحت منك في نعمة', false, ['morning:m_015']],
  ['amsaytu-fi-nimah', 'اللهم إني أمسيت منك في نعمة', false, ['evening:e_099']],
  ['hamm-wal-hazan', 'أعوذ بك من الهم والحزن', false, ['morning:m_016', 'evening:e_016']],
  ['afiyah', 'أسألك العافية في الدنيا والآخرة', false, ['morning:m_017']],
  ['afiyah-alt', 'أسألك العافية في الدنيا والآخرة', false, ['evening:e_017']],
  ['sayyid-al-istighfar', 'سيد الاستغفار', false, ['morning:m_018_uthaymeen']],
  ['sayyid-al-istighfar-alt', 'سيد الاستغفار', false, ['morning:baz_025', 'evening:e_018_uthaymeen', 'evening:baz_025']],
  ['fatir-as-samawat', 'اللهم فاطر السماوات والأرض', false, ['morning:m_019_uthaymeen', 'evening:e_019_uthaymeen']],
  ['fatir-as-samawat-short', 'اللهم فاطر السماوات والأرض', false, ['morning:baz_026', 'evening:baz_026']],
  ['asbahtu-ushhiduk', 'اللهم إني أصبحت أشهدك', false, ['morning:m_020']],
  ['amsaytu-ushhiduk', 'اللهم إني أمسيت أشهدك', false, ['evening:e_015']],
  ['asbahna-ala-fitrah', 'أصبحنا على فطرة الإسلام', false, ['morning:baz_027']],
  ['amsayna-ala-fitrah', 'أمسينا على فطرة الإسلام', false, ['evening:baz_027']],
  ['afini-fi-badani', 'اللهم عافني في بدني', false, ['morning:baz_028', 'evening:baz_028']],
  ['kufr-wal-faqr', 'أعوذ بك من الكفر والفقر', false, ['morning:baz_029', 'evening:baz_029']],
  ['hasbiyallah', 'حسبي الله لا إله إلا هو', false, ['morning:m_021', 'evening:e_021']],
  ['hasbiyallah-wa-kafa', 'حسبي الله وكفى', false, ['morning:m_022', 'evening:e_022']],
  ['tahleel', 'لا إله إلا الله وحده لا شريك له', false, ['morning:m_024', 'evening:e_024', 'morning:baz_030', 'evening:baz_030', 'post-prayer:6']],
  ['subhanallah-wa-bihamdih', 'سبحان الله وبحمده', false, ['morning:m_025', 'evening:e_025']],
  ['astaghfirullah-wa-atubu', 'أستغفر الله وأتوب إليه', false, ['morning:m_023', 'evening:e_023']],
  ['istighfar-thalathan', 'أستغفر الله ثلاثًا', false, ['post-prayer:0']],
  ['anta-as-salam', 'اللهم أنت السلام', false, ['post-prayer:1']],
  ['la-mania-lima-atayt', 'اللهم لا مانع لما أعطيت', false, ['post-prayer:2']],
  ['subhanallah', 'سبحان الله', false, ['post-prayer:3']],
  ['alhamdulillah', 'الحمد لله', false, ['post-prayer:4']],
  ['allahu-akbar', 'الله أكبر', false, ['post-prayer:5']],
  ['aslamtu-wajhi', 'اللهم أسلمت وجهي إليك', false, ['sleep:5']],
  ['bismika-amutu', 'باسمك اللهم أموت وأحيا', false, ['sleep:6']],
];

// Merged although the letters differ: spelling only, not wording.
const SPELLING_MERGES = { 'fatir-as-samawat': 'سوءٍ / سوءًا — spelling only' };

// Old "fadhel" values that are really a hadith source, not a virtue.
const SOURCE_NOT_FADL = /^(صحيح مسلم|صحيح البخاري|متفق عليه|رواه|خرجه|أخرجه)/;

const REVIEW_NOTES = [
  ['afiyah', 'afiyah-alt', 'Morning and evening copies differ in a few words (إني، عورتي/عوراتي). Probably one thiker — pick one wording.'],
  ['sayyid-al-istighfar', 'sayyid-al-istighfar-alt', 'Differ only by «لك». Probably one thiker — pick one wording.'],
  ['fatir-as-samawat', 'fatir-as-samawat-short', 'Ibn Baz version is shorter; its recording is the long version.'],
  ['asbahna-almulk', 'asbahna-almulk-long', 'Ibn Baz version also contains «رب أسألك خير ما في هذا اليوم»; its recording is the short version.'],
];

const TASBIH = {
  targets: [33, 99, 100],
  phrases: [
    { id: 'subhanallah', text: 'سُبْحَانَ اللَّهِ', target: 33 },
    { id: 'alhamdulillah', text: 'الْحَمْدُ لِلَّهِ', target: 33 },
    { id: 'allahu-akbar', text: 'اللَّهُ أَكْبَرُ', target: 33 },
    { id: 'la-ilaha-illallah', text: 'لَا إِلَٰهَ إِلَّا اللَّهُ', target: 100 },
    { id: 'astaghfirullah', text: 'أَسْتَغْفِرُ اللَّهَ', target: 100 },
    { id: 'subhanallah-wa-bihamdih', text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', target: 100 },
    { id: 'hawqalah', text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', target: 100 },
    { id: 'salat-alan-nabi', text: 'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ', target: 100 },
  ],
};

const readJson = (p) => JSON.parse(readFileSync(join(DATA, p), 'utf8'));
const writeJson = (p, data) => writeFileSync(join(OUT, p), `${JSON.stringify(data, null, 2)}\n`);

const normalize = (t) => t
  .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
  .replace(/[^ء-ي ]/g, ' ')
  .split(/\s+/).filter(Boolean).join(' ');

const stripTitlePrefix = (text) => text.replace(/^آية الكرسي:\s*/, '').trim();

if (existsSync(OUT) && !process.argv.includes('--force')) {
  console.error('content/ already exists. It may contain edits — pass --force to overwrite it.');
  process.exit(1);
}

const pools = {
  morning: readJson('Morning_pool.json').athkar_pool,
  evening: readJson('Evening_pool.json').athkar_pool,
};
const postPrayer = readJson('post-prayer.json');
const sleep = readJson('sleep.json');
const lists = { 'post-prayer': postPrayer.athkar, sleep: sleep.athkar };
const sheikhConfigs = readJson('sheikh_configs.json');

const sourceItem = (key) => {
  const [col, k] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
  return pools[col]?.[k] ?? lists[col]?.[Number(k)];
};

const fail = (msg) => { console.error(`✗ ${msg}`); process.exit(1); };

// Every old item must be mapped, so nothing is silently dropped.
const keyToId = {};
for (const [id, , , keys] of ATHKAR) {
  for (const key of keys) {
    if (!sourceItem(key)) fail(`${id}: source ${key} does not exist`);
    if (keyToId[key]) fail(`${key} is mapped twice (${keyToId[key]}, ${id})`);
    keyToId[key] = id;
  }
}
const allKeys = [
  ...Object.keys(pools.morning).map((k) => `morning:${k}`),
  ...Object.keys(pools.evening).map((k) => `evening:${k}`),
  ...lists['post-prayer'].map((_, i) => `post-prayer:${i}`),
  ...lists.sleep.map((_, i) => `sleep:${i}`),
];
const unmapped = allKeys.filter((k) => !keyToId[k]);
if (unmapped.length) fail(`unmapped old items: ${unmapped.join(', ')}`);

const athkar = {};
const voiceOf = {};
const report = { merges: [], movedToSource: [], sharedRecordings: {}, dangling: [] };

for (const [id, title, quran, keys] of ATHKAR) {
  const items = keys.map(sourceItem);
  const text = stripTitlePrefix(items[0].text);
  const differing = items.filter((it) => normalize(stripTitlePrefix(it.text)) !== normalize(text));
  if (differing.length && !SPELLING_MERGES[id]) fail(`${id}: merged copies have different words`);

  athkar[id] = { title, text, ...(quran && { quran: true }) };

  const voices = [...new Set(items.map((it) => it.voice).filter(Boolean))];
  if (voices.length > 1) fail(`${id}: copies point to different recordings (${voices.join(', ')})`);
  if (voices[0]) {
    if (!existsSync(join(VOICES, voices[0]))) fail(`${id}: voices/${voices[0]} is missing`);
    voiceOf[id] = voices[0];
    (report.sharedRecordings[voices[0]] ??= []).push(id);
    const gained = keys.filter((k) => !sourceItem(k).voice);
    if (gained.length) report.merges.push({ id, keys, note: `audio now also plays for ${gained.join(', ')}` });
    else if (keys.length > 1) report.merges.push({ id, keys });
  } else if (keys.length > 1) {
    report.merges.push({ id, keys });
  }
}

const entryFor = (key) => {
  const item = sourceItem(key);
  const entry = { id: keyToId[key], num: item.num };
  const fadhel = (item.fadhel ?? '').trim();
  if (SOURCE_NOT_FADL.test(fadhel)) {
    entry.evidence = { source: fadhel };
    report.movedToSource.push({ id: entry.id, key, value: fadhel });
  } else if (fadhel) {
    entry.fadl = fadhel;
  }
  return entry;
};

const books = {};
for (const [col, sheikhs] of Object.entries(sheikhConfigs)) {
  for (const [sheikhKey, cfg] of Object.entries(sheikhs)) {
    const bookId = BOOK_IDS[sheikhKey] ?? fail(`unknown sheikh "${sheikhKey}"`);
    books[bookId] ??= { name: cfg.name, collections: {} };
    books[bookId].collections[col] = cfg.track.flatMap((trackId) => {
      const key = `${col}:${trackId}`;
      if (!sourceItem(key)) { report.dangling.push({ book: bookId, key }); return []; }
      return [entryFor(key)];
    });
  }
}
books.general = {
  name: 'عام',
  collections: {
    'post-prayer': lists['post-prayer'].map((_, i) => entryFor(`post-prayer:${i}`)),
    sleep: lists.sleep.map((_, i) => entryFor(`sleep:${i}`)),
  },
};

const collections = {
  morning: { title: 'أذكار الصباح', resetAt: 'fajr' },
  evening: { title: 'أذكار المساء', resetAt: 'asr' },
  'post-prayer': { title: postPrayer.title, resetAt: 'each-prayer' },
  sleep: { title: sleep.title, resetAt: 'isha' },
};

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'books'), { recursive: true });
mkdirSync(join(OUT, 'audio', RECITER.id), { recursive: true });

writeJson('manifest.json', { schemaVersion: 1, contentVersion: 1, defaultBook: 'baz', books: ['baz', 'uthaymeen', 'general'] });
writeJson('athkar.json', athkar);
writeJson('collections.json', collections);
for (const [bookId, book] of Object.entries(books)) writeJson(join('books', `${bookId}.json`), book);
for (const [id, file] of Object.entries(voiceOf)) copyFileSync(join(VOICES, file), join(OUT, 'audio', RECITER.id, `${id}.m4a`));
writeJson('reciters.json', { [RECITER.id]: { name: RECITER.name, recorded: Object.keys(voiceOf) } });
writeJson('tasbih.json', TASBIH);

// ---- report ----
const lines = [];
const out = (s = '') => lines.push(s);
const entriesWith = (pred) => Object.entries(books).flatMap(([b, book]) =>
  Object.entries(book.collections).flatMap(([c, list]) => list.filter(pred).map((e) => `${b}/${c}: ${e.id}`)));

out('# Content conversion report');
out();
out(`Generated by \`scripts/convert-content.mjs\`. ${allKeys.length} old items → ${Object.keys(athkar).length} athkar, ${Object.keys(voiceOf).length} with a recording.`);
out();
out('## Needs your ears — one recording used for different texts');
out();
out('Each of these recordings is attached to athkar whose words differ (often أصبحنا vs أمسينا). At least one of them plays words that do not match its text. Listen and re-record or re-assign in the editor.');
out();
for (const [file, ids] of Object.entries(report.sharedRecordings)) {
  if (ids.length > 1) out(`- \`${file}\` → ${ids.map((i) => `\`${i}\``).join(', ')}`);
}
out();
out('## Needs your judgement — similar athkar kept separate');
out();
for (const [a, b, note] of REVIEW_NOTES) out(`- \`${a}\` / \`${b}\` — ${note}`);
out();
out('## Merged duplicates');
out();
for (const m of report.merges) out(`- \`${m.id}\` ← ${m.keys.join(', ')}${m.note ? ` — **${m.note}**` : ''}`);
for (const [id, why] of Object.entries(SPELLING_MERGES)) out(`- \`${id}\` merged despite a letter difference: ${why}`);
out();
out('## Cleaned up');
out();
for (const d of report.dangling) out(`- Removed \`${d.key}\` from ${d.book}: it was listed but never existed.`);
for (const m of report.movedToSource) out(`- \`${m.id}\` (${m.key}): «${m.value}» moved from virtue to evidence source.`);
out('- Dropped hard-coded text colors and empty virtue fields; «آية الكرسي:» prefixes became the title.');
out();
out('## Still missing');
out();
const noAudio = entriesWith((e) => !voiceOf[e.id]);
out(`**No recording (${noAudio.length} entries):**`);
out();
for (const s of noAudio) out(`- ${s}`);
out();
const noFadl = entriesWith((e) => !e.fadl);
out(`**No virtue text (${noFadl.length} entries).** No entry has evidence yet — you'll add it in the editor.`);
out();
writeFileSync(join(OUT, 'REPORT.md'), `${lines.join('\n')}\n`);

const { errors, warnings } = validateContent(OUT);
for (const w of warnings) console.warn(`warning: ${w}`);
for (const e of errors) console.error(`error: ${e}`);
if (errors.length) fail(`${errors.length} validation error(s)`);
console.log(`✓ content/ written — ${Object.keys(athkar).length} athkar, ${Object.keys(voiceOf).length} recordings. See content/REPORT.md`);
