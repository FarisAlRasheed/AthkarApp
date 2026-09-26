'use strict';

const GRADES = ['صحيح', 'حسن', 'ضعيف', 'موضوع'];
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const state = {
  content: null,
  dirty: false,
  view: 'athkar',
  selected: null,
  search: '',
  book: null,
  collection: null,
  reciter: null,
  newIds: new Set(),
};

const $ = (sel) => document.querySelector(sel);

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'value' || k === 'checked') el[k] = v;
    else el.setAttribute(k, v === true && !k.startsWith('aria-') ? '' : v);
  }
  for (const c of children.flat()) {
    if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

const normalize = (t) => t
  .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

const toArabicDigits = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

// ---------- data helpers ----------

const C = () => state.content;

function usagesOf(id) {
  const out = [];
  for (const bookId of C().manifest.books) {
    for (const [colId, list] of Object.entries(C().books[bookId].collections)) {
      list.forEach((entry, index) => { if (entry.id === id) out.push({ bookId, colId, index, entry }); });
    }
  }
  return out;
}

const isRecorded = (id, reciter = state.reciter) => C().reciters[reciter]?.recorded.includes(id);

function setOptional(obj, key, value) {
  if (value.trim()) obj[key] = value; else delete obj[key];
}

function setEvidence(entry, key, value) {
  const ev = { ...entry.evidence };
  setOptional(ev, key, value);
  if (Object.keys(ev).length) entry.evidence = ev; else delete entry.evidence;
}

function markDirty() {
  state.dirty = true;
  $('#save').disabled = false;
  $('#status').textContent = 'تعديلات غير محفوظة';
}

function nextNewId() {
  let n = Object.keys(C().athkar).length + 1;
  while (C().athkar[`thiker-${n}`]) n += 1;
  return `thiker-${n}`;
}

function renameThiker(oldId, newId) {
  const renamed = {};
  for (const [k, v] of Object.entries(C().athkar)) renamed[k === oldId ? newId : k] = v;
  C().athkar = renamed;
  for (const u of usagesOf(oldId)) u.entry.id = newId;
  state.newIds.delete(oldId);
  state.newIds.add(newId);
  state.selected = newId;
}

// ---------- server ----------

async function load() {
  const res = await fetch('/api/content');
  state.content = await res.json();
  state.reciter ??= Object.keys(C().reciters)[0];
  state.book ??= C().manifest.defaultBook;
  render();
}

async function save() {
  $('#save').disabled = true;
  $('#status').textContent = 'جارٍ الحفظ…';
  const res = await fetch('/api/content', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(C()),
  });
  const body = await res.json();
  if (!res.ok) {
    showProblems(body.errors ?? [body.error], body.warnings);
    $('#status').textContent = 'لم يُحفظ — صحّح الأخطاء';
    $('#save').disabled = false;
    return;
  }
  C().manifest.contentVersion = body.contentVersion;
  state.dirty = false;
  state.newIds.clear();
  showProblems([], body.warnings);
  $('#status').textContent = `تم الحفظ — إصدار المحتوى ${toArabicDigits(body.contentVersion)}`;
  render();
}

function showProblems(errors, warnings = []) {
  const box = $('#problems');
  const lines = [...errors.map((e) => `✗ ${e}`), ...warnings.map((w) => `! ${w}`)];
  box.hidden = !lines.length;
  box.classList.toggle('ok', !errors.length);
  box.textContent = lines.join('\n');
  if (errors.length) window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function uploadAudio(id, file) {
  const res = await fetch(`/api/audio/${state.reciter}/${id}`, { method: 'PUT', body: file });
  const body = await res.json();
  if (!res.ok) { alert(body.error); return; }
  C().reciters = body.reciters;
  render();
}

async function deleteAudio(id, reciter = state.reciter) {
  const res = await fetch(`/api/audio/${reciter}/${id}`, { method: 'DELETE' });
  C().reciters = (await res.json()).reciters;
}

// ---------- rendering ----------

function render() {
  document.querySelectorAll('.views button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.view === state.view));
  const main = $('#main');
  main.replaceChildren(state.view === 'athkar' ? renderAthkarView() : renderBooksView());
  main.querySelector('.item[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
}

function renderAthkarView() {
  return h('div', { class: 'split' }, renderAthkarList(), h('div', { id: 'editor' }, renderThikerEditor()));
}

function renderAthkarList() {
  const list = h('div', { class: 'list' });
  const fill = () => {
    const q = normalize(state.search.trim());
    list.replaceChildren(...Object.entries(C().athkar)
      .filter(([id, t]) => !q || normalize(`${t.title} ${t.text} ${id}`).includes(q))
      .map(([id, t]) => {
        const uses = usagesOf(id).length;
        return h('button', {
          type: 'button', class: 'item', 'aria-current': id === state.selected,
          onclick: () => { state.selected = id; render(); },
        },
        h('span', { class: 'badges' }, isRecorded(id) ? '🔊 ' : '', uses ? `${toArabicDigits(uses)} موضع` : '⚠ غير مستخدم'),
        t.title, h('small', {}, id));
      }));
  };
  fill();
  return h('aside', { class: 'panel list-panel' },
    h('div', { class: 'row' },
      h('input', { type: 'search', placeholder: 'بحث في الأذكار…', value: state.search, oninput: (e) => { state.search = e.target.value; fill(); } }),
      h('button', { type: 'button', class: 'fit primary', onclick: addThiker }, '+ ذكر جديد')),
    list);
}

function addThiker() {
  const id = nextNewId();
  C().athkar[id] = { title: 'ذكر جديد', text: '' };
  state.newIds.add(id);
  state.selected = id;
  state.search = '';
  markDirty();
  render();
}

function renderThikerEditor() {
  const id = state.selected;
  const t = C().athkar[id];
  if (!t) return h('div', { class: 'panel muted' }, 'اختر ذكرًا من القائمة، أو أنشئ ذكرًا جديدًا.');
  const uses = usagesOf(id);
  const preview = h('div', { class: `preview arabic${t.quran ? ' quran' : ''}` }, t.text || '…');

  return h('div', { class: 'stack' },
    h('div', { class: 'panel stack' },
      h('div', { class: 'row' },
        h('h2', {}, t.title),
        h('button', {
          type: 'button', class: 'fit danger', disabled: uses.length > 0,
          title: uses.length ? 'احذفه من جميع الكتب أولًا' : '',
          onclick: () => removeThiker(id),
        }, 'حذف الذكر')),
      state.newIds.has(id)
        ? h('div', {},
          h('label', {}, 'المعرّف (بالإنجليزية، لا يتغيّر بعد الحفظ)'),
          h('input', {
            dir: 'ltr', value: id,
            onchange: (e) => {
              const next = e.target.value.trim();
              if (next === id) return;
              if (!ID_PATTERN.test(next)) { alert('أحرف إنجليزية صغيرة وأرقام وشرطات فقط، مثل: morning-dua'); e.target.value = id; return; }
              if (C().athkar[next]) { alert('هذا المعرّف مستخدم'); e.target.value = id; return; }
              renameThiker(id, next);
              markDirty();
              render();
            },
          }))
        : h('p', { class: 'muted', dir: 'ltr' }, id),
      h('div', {},
        h('label', {}, 'العنوان'),
        h('input', { value: t.title, oninput: (e) => { t.title = e.target.value; markDirty(); }, onchange: render })),
      h('div', {},
        h('label', {}, 'النص'),
        h('textarea', {
          class: 'arabic', rows: 6, value: t.text, readOnly: !!t.ayahs,
          oninput: (e) => { t.text = e.target.value; preview.textContent = t.text || '…'; markDirty(); },
        }),
        // Quranic text comes from the KFGQPC Hafs data (npm run content:quran), never typed by hand.
        t.ayahs
          ? h('p', { class: 'muted' },
            `نص قرآني من مصحف مجمع الملك فهد (سورة ${toArabicDigits(t.ayahs.sura)}، الآيات ${toArabicDigits(t.ayahs.from)}–${toArabicDigits(t.ayahs.to)}) — يُحدَّث بالأمر npm run content:quran`)
          : null),
      h('label', { class: 'row' },
        h('input', {
          type: 'checkbox', class: 'fit', checked: !!t.quran,
          onchange: (e) => { if (e.target.checked) t.quran = true; else delete t.quran; preview.classList.toggle('quran', !!t.quran); markDirty(); },
        }),
        h('span', {}, 'نص قرآني')),
      h('div', {}, h('label', {}, 'معاينة'), preview)),
    renderAudio(id),
    h('div', { class: 'panel stack' },
      h('h3', {}, `المواضع (${toArabicDigits(uses.length)}) — التكرار والفضل والدليل`),
      uses.length ? null : h('p', { class: 'muted' }, 'هذا الذكر غير مستخدم في أي كتاب بعد.'),
      ...uses.map((u) => renderUsage(u, uses)),
      renderQuickAdd(id)));
}

function renderAudio(id) {
  const reciterIds = Object.keys(C().reciters);
  const recorded = isRecorded(id);
  return h('div', { class: 'panel stack' },
    h('div', { class: 'row' },
      h('h3', {}, 'التسجيل الصوتي'),
      reciterIds.length > 1
        ? h('select', { class: 'fit', onchange: (e) => { state.reciter = e.target.value; render(); } },
          reciterIds.map((r) => h('option', { value: r, selected: r === state.reciter }, C().reciters[r].name)))
        : h('span', { class: 'fit muted' }, C().reciters[state.reciter].name)),
    recorded ? h('audio', { controls: true, src: `/audio/${state.reciter}/${id}.m4a?t=${Date.now()}` }) : h('p', { class: 'muted' }, 'لا يوجد تسجيل لهذا الذكر.'),
    state.newIds.has(id)
      ? h('p', { class: 'muted' }, 'احفظ الذكر أولًا ثم ارفع التسجيل.')
      : h('div', { class: 'row' },
        h('label', { class: 'fit' }, recorded ? 'استبدال التسجيل (m4a):' : 'رفع تسجيل (m4a):'),
        h('input', { type: 'file', accept: '.m4a,audio/mp4,audio/x-m4a', onchange: (e) => e.target.files[0] && uploadAudio(id, e.target.files[0]) }),
        recorded ? h('button', {
          type: 'button', class: 'fit danger',
          onclick: async () => { if (confirm('حذف التسجيل؟')) { await deleteAudio(id); render(); } },
        }, 'حذف التسجيل') : null));
}

function renderUsage(u, allUses) {
  const { entry } = u;
  const book = C().books[u.bookId];
  const ev = entry.evidence ?? {};
  const others = allUses.filter((o) => o !== u);
  return h('div', { class: 'usage' },
    h('header', {},
      h('strong', {}, `${book.name} · ${C().collections[u.colId].title} · الموضع ${toArabicDigits(u.index + 1)}`),
      others.length ? h('button', {
        type: 'button', class: 'link',
        onclick: () => {
          if (!confirm(`نسخ الفضل والدليل من هنا إلى ${toArabicDigits(others.length)} موضع آخر؟ سيُستبدل ما فيها.`)) return;
          for (const o of others) {
            if (entry.fadl) o.entry.fadl = entry.fadl; else delete o.entry.fadl;
            if (entry.evidence) o.entry.evidence = structuredClone(entry.evidence); else delete o.entry.evidence;
          }
          markDirty();
          render();
        },
      }, 'نسخ الفضل والدليل إلى بقية المواضع') : null),
    h('div', { class: 'row' },
      h('div', { class: 'fit' },
        h('label', {}, 'التكرار'),
        h('input', { type: 'number', min: 1, value: entry.num, style: 'width:90px', oninput: (e) => { entry.num = Number(e.target.value); markDirty(); } }))),
    h('label', {}, 'فضل الذكر'),
    h('textarea', { rows: 2, value: entry.fadl ?? '', oninput: (e) => { setOptional(entry, 'fadl', e.target.value); markDirty(); } }),
    h('div', { class: 'evidence' },
      h('div', { class: 'wide' },
        h('label', {}, 'الدليل (نص الحديث)'),
        h('textarea', { rows: 3, value: ev.text ?? '', oninput: (e) => { setEvidence(entry, 'text', e.target.value); markDirty(); } })),
      h('div', {},
        h('label', {}, 'المصدر والتخريج'),
        h('input', { value: ev.source ?? '', placeholder: 'مثال: رواه مسلم (٢٧٢٣)', oninput: (e) => { setEvidence(entry, 'source', e.target.value); markDirty(); } })),
      h('div', {},
        h('label', {}, 'الدرجة'),
        h('select', { onchange: (e) => { setEvidence(entry, 'grade', e.target.value); markDirty(); } },
          h('option', { value: '' }, '—'),
          GRADES.map((g) => h('option', { value: g, selected: ev.grade === g }, g)))),
      h('div', { class: 'wide' },
        h('label', {}, 'ملاحظة على الدرجة (اختياري)'),
        h('input', { value: ev.gradeNote ?? '', placeholder: 'مثال: صححه الألباني', oninput: (e) => { setEvidence(entry, 'gradeNote', e.target.value); markDirty(); } }))));
}

function renderQuickAdd(id) {
  const bookSel = h('select', {}, C().manifest.books.map((b) => h('option', { value: b, selected: b === state.book }, C().books[b].name)));
  const colSel = h('select', {}, Object.entries(C().collections).map(([c, col]) => h('option', { value: c }, col.title)));
  const num = h('input', { type: 'number', min: 1, value: 1 });
  return h('div', { class: 'usage' },
    h('h3', {}, 'إضافة إلى كتاب'),
    h('div', { class: 'row' },
      bookSel, colSel, h('div', { class: 'fit', style: 'width:90px' }, num),
      h('button', {
        type: 'button', class: 'fit',
        onclick: () => {
          const book = C().books[bookSel.value];
          (book.collections[colSel.value] ??= []).push({ id, num: Number(num.value) || 1 });
          markDirty();
          render();
        },
      }, 'إضافة في آخر القائمة')));
}

function removeThiker(id) {
  if (!confirm(`حذف «${C().athkar[id].title}»؟ (يُحذف تسجيله أيضًا عند الحفظ)`)) return;
  delete C().athkar[id];
  state.newIds.delete(id);
  state.selected = null;
  markDirty();
  render();
}

// ---------- books view ----------

function renderBooksView() {
  const m = C().manifest;
  if (!C().books[state.book]) state.book = m.defaultBook;
  const book = C().books[state.book];
  const colIds = Object.keys(book.collections);
  if (!colIds.includes(state.collection)) state.collection = colIds[0] ?? null;

  return h('div', { class: 'stack' },
    h('div', { class: 'panel' },
      h('div', { class: 'tabs' },
        m.books.map((b) => h('button', {
          type: 'button', 'aria-pressed': b === state.book,
          onclick: () => { state.book = b; render(); },
        }, C().books[b].name, b === m.defaultBook ? ' ★' : '')),
        h('button', { type: 'button', onclick: addBook }, '+ كتاب جديد')),
      h('div', { class: 'row' },
        h('div', {}, h('label', {}, 'اسم الكتاب'),
          h('input', { value: book.name, oninput: (e) => { book.name = e.target.value; markDirty(); }, onchange: render })),
        h('div', { class: 'fit' }, h('label', {}, ' '),
          h('button', {
            type: 'button', disabled: state.book === m.defaultBook,
            onclick: () => { m.defaultBook = state.book; markDirty(); render(); },
          }, state.book === m.defaultBook ? '★ الافتراضي للمستخدمين الجدد' : 'اجعله الافتراضي')),
        h('div', { class: 'fit' }, h('label', {}, ' '),
          h('button', { type: 'button', class: 'danger', disabled: state.book === m.defaultBook, onclick: removeBook }, 'حذف الكتاب')))),
    h('div', { class: 'panel' },
      h('div', { class: 'tabs' },
        colIds.map((c) => h('button', {
          type: 'button', 'aria-pressed': c === state.collection,
          onclick: () => { state.collection = c; render(); },
        }, `${C().collections[c].title} (${toArabicDigits(book.collections[c].length)})`)),
        renderAddCollection(book)),
      state.collection ? renderEntries(book, state.collection) : h('p', { class: 'muted' }, 'لا توجد مجموعات في هذا الكتاب.')));
}

function renderAddCollection(book) {
  const missing = Object.keys(C().collections).filter((c) => !book.collections[c]);
  if (!missing.length) return null;
  return h('select', {
    class: 'fit', style: 'width:auto',
    onchange: (e) => {
      if (!e.target.value) return;
      book.collections[e.target.value] = [];
      state.collection = e.target.value;
      markDirty();
      render();
    },
  }, h('option', { value: '' }, '+ إضافة مجموعة'), missing.map((c) => h('option', { value: c }, C().collections[c].title)));
}

function renderEntries(book, colId) {
  const list = book.collections[colId];
  const move = (i, d) => { [list[i], list[i + d]] = [list[i + d], list[i]]; markDirty(); render(); };

  const options = Object.entries(C().athkar).map(([id, t]) => h('option', { value: `${t.title} — ${id}` }));
  const pick = h('input', { list: 'athkar-options', placeholder: 'ابحث عن ذكر لإضافته…' });
  const num = h('input', { type: 'number', min: 1, value: 1 });

  return h('div', {},
    h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, '#'), h('th', {}, 'الذكر'), h('th', {}, 'التكرار'), h('th', {}, 'صوت'), h('th', {}, 'فضل'), h('th', {}, ''))),
      h('tbody', {}, list.map((e, i) => h('tr', {},
        h('td', {}, toArabicDigits(i + 1)),
        h('td', {}, h('button', {
          type: 'button', class: 'link',
          onclick: () => { state.view = 'athkar'; state.selected = e.id; render(); },
        }, C().athkar[e.id]?.title ?? `⚠ ${e.id}`)),
        h('td', { class: 'num' }, h('input', { type: 'number', min: 1, value: e.num, oninput: (ev) => { e.num = Number(ev.target.value); markDirty(); } })),
        h('td', {}, isRecorded(e.id) ? '🔊' : '—'),
        h('td', {}, e.fadl || e.evidence ? '✓' : '—'),
        h('td', { class: 'actions' },
          h('button', { type: 'button', disabled: i === 0, onclick: () => move(i, -1), title: 'للأعلى' }, '▲'),
          h('button', { type: 'button', disabled: i === list.length - 1, onclick: () => move(i, 1), title: 'للأسفل' }, '▼'),
          h('button', {
            type: 'button', class: 'danger', title: 'إزالة من القائمة',
            onclick: () => { if (confirm('إزالة هذا الذكر من القائمة؟ (سيُحذف فضله ودليله في هذا الموضع)')) { list.splice(i, 1); markDirty(); render(); } },
          }, '✕')))))),
    h('datalist', { id: 'athkar-options' }, options),
    h('div', { class: 'row', style: 'margin-top:12px' },
      pick, h('div', { class: 'fit', style: 'width:90px' }, num),
      h('button', {
        type: 'button', class: 'fit primary',
        onclick: () => {
          const id = pick.value.split(' — ').pop();
          if (!C().athkar[id]) { alert('اختر ذكرًا من القائمة'); return; }
          list.push({ id, num: Number(num.value) || 1 });
          markDirty();
          render();
        },
      }, 'إضافة')),
    h('p', { class: 'muted' }, 'لإنشاء ذكر جديد غير موجود: من تبويب «الأذكار» ← «+ ذكر جديد».'));
}

function addBook() {
  const id = prompt('معرّف الكتاب بالإنجليزية (مثال: albani):')?.trim();
  if (!id) return;
  if (!ID_PATTERN.test(id) || C().books[id]) { alert('معرّف غير صالح أو مستخدم'); return; }
  const name = prompt('اسم الكتاب (مثال: الشيخ الألباني):')?.trim();
  if (!name) return;
  C().books[id] = { name, collections: {} };
  C().manifest.books.push(id);
  state.book = id;
  markDirty();
  render();
}

function removeBook() {
  if (!confirm(`حذف كتاب «${C().books[state.book].name}» بكل قوائمه؟`)) return;
  delete C().books[state.book];
  C().manifest.books = C().manifest.books.filter((b) => b !== state.book);
  state.book = C().manifest.defaultBook;
  markDirty();
  render();
}

// ---------- boot ----------

document.querySelectorAll('.views button').forEach((b) => b.addEventListener('click', () => { state.view = b.dataset.view; render(); }));
$('#save').addEventListener('click', save);
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); if (state.dirty) save(); }
});
window.addEventListener('beforeunload', (e) => { if (state.dirty) e.preventDefault(); });
load();
