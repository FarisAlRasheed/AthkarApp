/* =====================================================
   Athkar App — script.js
   ===================================================== */

// ── List of JSON files in /data folder ──
const ATHKAR_FILES = [
  'morning.json',
  'evening.json'
];

// ── State ──
let athkarCollections = [];
let currentFileIndex = 0;
let cardsData = [];
let counters = [];
let currentIndex = 0;
let isFlipped = false;
let parallaxOffset = 0;
let currentVoiceDir = 'voices';

// Animation management — interruptible
let animationTimer = null;
let activeAudio = null;

// ── DOM refs ──
const cardOuter   = document.getElementById('card');
const titleEl     = document.getElementById('athkarTitle');
const dropdownEl  = document.getElementById('dropdownMenu');
const arrowEl     = document.getElementById('dropdownArrow');
const nightBgEl   = document.getElementById('nightBg');
const morningBgEl = document.getElementById('morningBg');
const hintUp      = document.getElementById('hintUp');
const hintDown    = document.getElementById('hintDown');
const hintLeft    = document.getElementById('hintLeft');
const hintRight   = document.getElementById('hintRight');
const resetAllBtn = document.getElementById('resetAllBtn');

// ── LocalStorage ──
const LS_COUNTERS = 'athkar_counters_v2';
const LS_INDEX    = 'athkar_cardindex_v2';
const LS_FILE     = 'athkar_file_v2';

// ── Quranic character detection ──
// These Unicode characters are unique to Othmanic script
const QURAN_CHARS = /[\u0671\u06D6-\u06ED\u08D4-\u08E1\u0615-\u061A\uFD3E\uFD3F\u0670]/;
// Simpler: check for Othmanic-specific characters like ٱ (alef wasla), ۖ ۗ ۚ ۛ ٰ etc.
function isQuranicText(text){
  return QURAN_CHARS.test(text);
}

// ── Basmalah detection ──
const BASMALAH_PATTERN = /^بسم\s+الله\s+الرحمن\s+الرحيم/;
function splitBasmalah(text){
  const match = text.match(BASMALAH_PATTERN);
  if(match){
    const basmalah = match[0];
    let rest = text.slice(basmalah.length).replace(/^[\s.،,]+/, '').trim();
    return { basmalah, rest };
  }
  return { basmalah: null, rest: text };
}

/* =========================================
   ARABIC/HINDI DIGITS
   ========================================= */
const ARABIC_DIGITS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
function toArabicDigits(value){
  return String(value).replace(/\d/g, d => ARABIC_DIGITS[Number(d)]);
}

/* =========================================
   VOICE
   ========================================= */
function resolveVoiceSrc(voice){
  if(!voice) return null;
  if(voice.startsWith('http') || voice.startsWith('/')) return voice;
  return `${currentVoiceDir}/${voice}`;
}

function playVoice(voice){
  const src = resolveVoiceSrc(voice);
  if(!src) return;
  if(activeAudio){
    activeAudio.pause();
    activeAudio.currentTime = 0;
  }
  activeAudio = new Audio(src);
  activeAudio.play().catch(() => {});
}

function getParallaxConfig(text){
  const length = Math.min(800, (text || '').length);
  const factor = length / 800; // 0..1
  const step = 4 - (2 * factor);
  const limit = 70 - (25 * factor);
  return { step, limit };
}

/* =========================================
   LOAD ALL JSON FILES
   ========================================= */
async function loadAllCollections(){
  const promises = ATHKAR_FILES.map(f =>
    fetch(`data/${f}`).then(r => {
      if(!r.ok) throw new Error(`Failed to load data/${f}`);
      return r.json();
    }).catch(err => {
      console.warn(err);
      return null;
    })
  );
  const results = await Promise.all(promises);
  athkarCollections = results.filter(Boolean);
  if(athkarCollections.length === 0){
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-size:20px;color:#999;text-align:center;padding:20px">لم يتم العثور على ملفات أذكار<br>تأكد من وجود ملفات JSON في مجلد /data</div>';
    return false;
  }
  return true;
}

/* =========================================
   DETERMINE DEFAULT FILE BY TIME
   ========================================= */
function getDefaultFileIndex(){
  const saved = localStorage.getItem(LS_FILE);
  if(saved !== null){
    const idx = parseInt(saved, 10);
    if(!isNaN(idx) && idx >= 0 && idx < athkarCollections.length) return idx;
  }
  const hour = new Date().getHours();
  const wantTheme = (hour >= 3 && hour < 15) ? 'morning' : 'evening';
  const idx = athkarCollections.findIndex(c => c.theme === wantTheme);
  return idx >= 0 ? idx : 0;
}

/* =========================================
   SWITCH COLLECTION
   ========================================= */
function switchCollection(fileIdx){
  currentFileIndex = fileIdx;
  const col = athkarCollections[fileIdx];
  cardsData = col.athkar;
  currentVoiceDir = col.voiceDir || 'voices';

  document.body.className = col.theme === 'evening' ? 'theme-evening' : 'theme-morning';
  titleEl.textContent = col.title;

  currentIndex = 0;
  isFlipped = false;
  parallaxOffset = 0;
  counters = new Array(cardsData.length).fill(0);

  // Reset parallax
  nightBgEl.style.transform = '';
  morningBgEl.style.transform = '';

  loadState();
  render();
  updateDropdownUI();
  updateHintArrows();

  localStorage.setItem(LS_FILE, String(fileIdx));
}

/* =========================================
   DROPDOWN MENU
   ========================================= */
function buildDropdown(){
  dropdownEl.innerHTML = '';
  athkarCollections.forEach((col, i) => {
    const opt = document.createElement('div');
    opt.className = 'dropdown-option' + (i === currentFileIndex ? ' active' : '');
    opt.textContent = col.title;
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDropdown();
      if(i !== currentFileIndex) switchCollection(i);
    });
    dropdownEl.appendChild(opt);
  });
}

function toggleDropdown(){
  const isOpen = dropdownEl.classList.contains('open');
  if(isOpen) closeDropdown();
  else openDropdown();
}
function openDropdown(){
  dropdownEl.classList.add('open');
  arrowEl.classList.add('open');
}
function closeDropdown(){
  dropdownEl.classList.remove('open');
  arrowEl.classList.remove('open');
}
function updateDropdownUI(){
  const opts = dropdownEl.querySelectorAll('.dropdown-option');
  opts.forEach((opt, i) => {
    opt.classList.toggle('active', i === currentFileIndex);
  });
}

document.getElementById('titleDropdown').addEventListener('click', toggleDropdown);
document.addEventListener('click', (e) => {
  if(!e.target.closest('.title-dropdown')) closeDropdown();
});

/* =========================================
   PERSISTENCE
   ========================================= */
function loadState(){
  try{
    const key = `${LS_COUNTERS}_${currentFileIndex}`;
    const raw = localStorage.getItem(key);
    if(raw){
      const parsed = JSON.parse(raw);
      if(Array.isArray(parsed)){
        for(let i = 0; i < Math.min(parsed.length, cardsData.length); i++){
          counters[i] = Number(parsed[i]) || 0;
        }
      }
    }
    const idxKey = `${LS_INDEX}_${currentFileIndex}`;
    const idxRaw = localStorage.getItem(idxKey);
    if(idxRaw != null){
      const n = Number(idxRaw);
      if(!isNaN(n) && n >= 0 && n < cardsData.length) currentIndex = n;
    }
  } catch(e){ console.warn('loadState error', e); }
}

function saveState(){
  try{
    localStorage.setItem(`${LS_COUNTERS}_${currentFileIndex}`, JSON.stringify(counters));
    localStorage.setItem(`${LS_INDEX}_${currentFileIndex}`, String(currentIndex));
  } catch(e){ console.warn('saveState error', e); }
}

/* =========================================
   CREATE CARD ELEMENT
   ========================================= */
function createCardElement(index){
  const data = cardsData[index];
  const maxCount = data.num || 1;
  const hasFadhel = !!data.fadhel;
  const hasCounter = maxCount > 1;

  const wrapper = document.createElement('div');
  wrapper.className = 'card-wrap';
  if(!hasFadhel) wrapper.classList.add('flip-disabled');
  if(!hasCounter) wrapper.classList.add('single-count');

  const card = document.createElement('div');
  card.className = 'card';

  // ── FRONT FACE ──
  const front = document.createElement('div');
  front.className = 'face front';

  // Card top bar (progress + index)
  const cardTop = document.createElement('div');
  cardTop.className = 'card-top';
  const cardProgress = document.createElement('div');
  cardProgress.className = 'card-progress';
  const cardProgressFill = document.createElement('div');
  cardProgressFill.className = 'card-progress-fill';
  const total = cardsData.length;
  const overallRatio = total > 1 ? (index / (total - 1)) : 1;
  cardProgressFill.style.transform = `scaleX(${overallRatio})`;
  cardProgress.appendChild(cardProgressFill);
  const cardIndex = document.createElement('div');
  cardIndex.className = 'card-index';
  cardIndex.textContent = toArabicDigits(index + 1);
  cardTop.appendChild(cardProgress);
  cardTop.appendChild(cardIndex);
  front.appendChild(cardTop);

  // Upper text (optional)
  if(data.upperText){
    const upperText = document.createElement('div');
    upperText.className = 'upper-text';
    upperText.textContent = data.upperText;
    front.appendChild(upperText);
  }

  // Scrollable container for long text
  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'text-scroll-container';

  const rawText = data.text;
  const isQuran = isQuranicText(rawText);
  const { basmalah, rest } = splitBasmalah(rawText);

  // Add Basmalah if exists
  if(basmalah){
    const basmalahEl = document.createElement('div');
    basmalahEl.className = 'basmalah';
    basmalahEl.textContent = basmalah;
    scrollContainer.appendChild(basmalahEl);
  }

  // Main text
  const frontText = document.createElement('div');
  frontText.className = 'text-large';
  if(isQuran) frontText.classList.add('quran-text');
  frontText.textContent = rest;
  scrollContainer.appendChild(frontText);

  front.appendChild(scrollContainer);

  // Lower text (optional)
  if(data.lowerText){
    const lowerText = document.createElement('div');
    lowerText.className = 'lower-text';
    lowerText.textContent = data.lowerText;
    front.appendChild(lowerText);
  }

  // Check if content overflows after adding to DOM
  requestAnimationFrame(() => {
    if(scrollContainer.scrollHeight > scrollContainer.clientHeight + 4){
      scrollContainer.classList.add('has-overflow');
    }
  });

  // ── BACK FACE (only if fadhel exists) ──
  if(hasFadhel){
    const back = document.createElement('div');
    back.className = 'face back';
    const backTop = cardTop.cloneNode(true);
    back.appendChild(backTop);
    const label = document.createElement('div');
    label.className = 'fadhel-label';
    label.textContent = 'فضل الذكر';
    const backText = document.createElement('div');
    backText.className = 'fadhel-text';
    backText.textContent = data.fadhel;
    back.appendChild(label);
    back.appendChild(backText);
    card.appendChild(back);
  }

  card.appendChild(front);

  // ── CONTROLS (outside the card so they don't flip) ──
  const controls = document.createElement('div');
  controls.className = 'card-bottom';

  if(hasCounter){
    const countProgress = document.createElement('div');
    countProgress.className = 'count-progress';
    const countFill = document.createElement('div');
    countFill.className = 'count-progress-fill';
    countProgress.appendChild(countFill);
    controls.appendChild(countProgress);

    const countValue = document.createElement('div');
    countValue.className = 'count-value';
    countValue.textContent = toArabicDigits(counters[index]);
    controls.appendChild(countValue);

    if(data.voice){
      const playBtn = document.createElement('button');
      playBtn.className = 'play-btn';
      playBtn.innerHTML = '▶';
      playBtn.title = 'تشغيل الصوت';
      playBtn.addEventListener('click', (ev) => { ev.stopPropagation(); playVoice(data.voice); });
      controls.appendChild(playBtn);
    }

    updateCountUI(controls, index);
  } else {
    if(data.voice){
      controls.classList.add('center-only');
      const playBtn = document.createElement('button');
      playBtn.className = 'play-btn';
      playBtn.innerHTML = '▶';
      playBtn.title = 'تشغيل الصوت';
      playBtn.addEventListener('click', (ev) => { ev.stopPropagation(); playVoice(data.voice); });
      controls.appendChild(playBtn);
    }
  }

  wrapper.appendChild(card);
  wrapper.appendChild(controls);

  // Tap to increment (only if not a drag/swipe)
  wrapper.addEventListener('click', () => {
    if(movedDuringTouch) return;
    incrementCounter();
  });

  return wrapper;
}

/* =========================================
   UPDATE COUNT UI
   ========================================= */
function updateCountUI(container, index){
  if(!container) return;
  const countValue = container.querySelector('.count-value');
  const countFill = container.querySelector('.count-progress-fill');
  if(!countValue || !countFill) return;
  const current = counters[index] || 0;
  const max = cardsData[index].num || 1;
  const ratio = max > 0 ? Math.min(1, current / max) : 0;
  countValue.textContent = toArabicDigits(current);
  countFill.style.transform = `scaleX(${ratio})`;
}

/* =========================================
   RENDER
   ========================================= */
function render(){
  // Cancel any pending animation
  cancelAnimation();
  
  cardOuter.innerHTML = '';
  isFlipped = false;
  const el = createCardElement(currentIndex);
  cardOuter.appendChild(el);
  el.id = 'activeCard';
  updateHintArrows();
}

/* =========================================
   COUNTER LOGIC
   ========================================= */
function incrementCounter(){
  const max = cardsData[currentIndex].num || 1;
  if(counters[currentIndex] >= max) return;
  counters[currentIndex]++;

  const wrap = document.getElementById('activeCard');
  if(wrap){
    const controls = wrap.querySelector('.card-bottom');
    updateCountUI(controls, currentIndex);
  }
  saveState();

  // Auto-advance when counter reaches max
  if(counters[currentIndex] >= max){
    setTimeout(() => {
      if(currentIndex < cardsData.length - 1){
        goToIndex(currentIndex + 1);
      } else {
        showCompletion();
      }
    }, 450);
  }
}

function resetCounter(){
  counters[currentIndex] = 0;
  const wrap = document.getElementById('activeCard');
  if(wrap){
    const controls = wrap.querySelector('.card-bottom');
    updateCountUI(controls, currentIndex);
  }
  saveState();
}

/* =========================================
   COMPLETION SCREEN
   ========================================= */
function showCompletion(){
  const overlay = document.createElement('div');
  overlay.className = 'completion-overlay';
  overlay.innerHTML = `
    <div class="completion-card">
      <h2>تقبّل الله ✨</h2>
      <p>أتممت ${titleEl.textContent} بنجاح</p>
    </div>
  `;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

/* =========================================
   CANCEL IN-FLIGHT ANIMATION
   ========================================= */
function cancelAnimation(){
  if(animationTimer){
    clearTimeout(animationTimer);
    animationTimer = null;
  }
  // Clean up any old wraps that aren't the active card
  const wraps = cardOuter.querySelectorAll('.card-wrap');
  wraps.forEach(w => {
    if(w.id !== 'activeCard') w.remove();
  });
}

/* =========================================
   NAVIGATION — INTERRUPTIBLE
   ========================================= */
function goToIndex(idx){
  if(idx < 0 || idx >= cardsData.length || idx === currentIndex) return;
  const dir = idx > currentIndex ? 'up' : 'down';
  animateToIndex(idx, dir);
}

function animateToIndex(newIndex, direction){
  // INTERRUPTIBLE: cancel any in-flight animation immediately
  cancelAnimation();

  // Immediately update the logical index
  const oldIndex = currentIndex;
  currentIndex = newIndex;
  isFlipped = false;

  const currentWrap = document.getElementById('activeCard');
  const newWrap = createCardElement(newIndex);

  // Parallax for both themes
  const bgEl = document.body.classList.contains('theme-evening') ? nightBgEl : morningBgEl;
  const cfg = getParallaxConfig(cardsData[newIndex]?.text || '');
  parallaxOffset += direction === 'up' ? -cfg.step : cfg.step;
  // Clamp parallax to avoid edges
  parallaxOffset = Math.max(-cfg.limit, Math.min(cfg.limit, parallaxOffset));
  bgEl.style.transform = `translateY(${parallaxOffset}px)`;

  newWrap.style.transform = `translateY(${direction === 'up' ? '100%' : '-100%'})`;
  newWrap.style.opacity = '0';
  cardOuter.appendChild(newWrap);

  // Force reflow
  void newWrap.offsetHeight;

  requestAnimationFrame(() => {
    if(currentWrap){
      currentWrap.id = '';  // remove active id immediately
      currentWrap.style.transform = `translateY(${direction === 'up' ? '-100%' : '100%'})`;
      currentWrap.style.opacity = '0';
    }
    newWrap.style.transform = 'translateY(0)';
    newWrap.style.opacity = '1';
    newWrap.id = 'activeCard';
  });

  // Update UI immediately (don't wait for animation)
  updateHintArrows();
  saveState();

  // Clean up old card after transition
  animationTimer = setTimeout(() => {
    if(currentWrap && currentWrap.parentNode) currentWrap.remove();
    animationTimer = null;
  }, 350);
}

/* =========================================
   FLIP
   ========================================= */
function toggleFlip(){
  const data = cardsData[currentIndex];
  if(!data.fadhel) return;

  isFlipped = !isFlipped;
  const wrap = document.getElementById('activeCard');
  if(!wrap) return;
  const card = wrap.querySelector('.card');
  if(!card) return;

  if(isFlipped){
    card.classList.add('flipped');
    wrap.classList.add('is-flipped');
  } else {
    card.classList.remove('flipped');
    wrap.classList.remove('is-flipped');
  }
  updateHintArrows();
}

/* =========================================
   HINT ARROWS VISIBILITY
   ========================================= */
function updateHintArrows(){
  hintUp.classList.toggle('hidden', currentIndex <= 0);
  hintDown.classList.toggle('hidden', currentIndex >= cardsData.length - 1);
  const hasFadhel = !!cardsData[currentIndex]?.fadhel;
  hintLeft.classList.toggle('hidden', !hasFadhel);
  hintRight.classList.toggle('hidden', !hasFadhel);
}

/* =========================================
   SWIPE / TOUCH / MOUSE — with in-card scroll awareness
   ========================================= */
let startX = 0, startY = 0, isTouching = false, movedDuringTouch = false;
const H_THRESH = 40, V_THRESH = 40;

function getScrollContainer(){
  const wrap = document.getElementById('activeCard');
  if(!wrap) return null;
  return wrap.querySelector('.text-scroll-container');
}

function isScrolledToTop(el){
  if(!el) return true;
  return el.scrollTop <= 2;
}

function isScrolledToBottom(el){
  if(!el) return true;
  return el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
}

function onStart(x, y){
  startX = x; startY = y; isTouching = true; movedDuringTouch = false;
}
function onMove(x, y){
  if(!isTouching) return;
  if(Math.abs(x - startX) > 8 || Math.abs(y - startY) > 8) movedDuringTouch = true;
}
function onEnd(x, y){
  if(!isTouching) return;
  isTouching = false;
  const dx = x - startX, dy = y - startY;

  // Horizontal swipe → flip
  if(Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > H_THRESH){
    toggleFlip();
    return;
  }

  // Vertical swipe → navigate, but respect in-card scroll
  if(Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > V_THRESH){
    const scrollEl = getScrollContainer();
    const hasOverflow = scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight + 4;

    if(dy < 0){
      // Swipe up → go to next card
      if(!hasOverflow || isScrolledToBottom(scrollEl)){
        goToIndex(currentIndex + 1);
      }
    } else {
      // Swipe down → go to previous card
      if(!hasOverflow || isScrolledToTop(scrollEl)){
        goToIndex(currentIndex - 1);
      }
    }
  }
}

cardOuter.addEventListener('touchstart', e => {
  const t = e.changedTouches[0];
  onStart(t.clientX, t.clientY);
}, {passive: true});

cardOuter.addEventListener('touchmove', e => {
  const t = e.changedTouches[0];
  onMove(t.clientX, t.clientY);
  
  // Only prevent default if we're not scrolling inside the card
  const scrollEl = getScrollContainer();
  const hasOverflow = scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight + 4;
  if(!hasOverflow){
    e.preventDefault();
  }
}, {passive: false});

cardOuter.addEventListener('touchend', e => {
  const t = e.changedTouches[0];
  onEnd(t.clientX, t.clientY);
});

let mouseDown = false;
cardOuter.addEventListener('mousedown', e => { mouseDown = true; onStart(e.clientX, e.clientY); });
window.addEventListener('mousemove', e => { if(mouseDown) onMove(e.clientX, e.clientY); });
window.addEventListener('mouseup', e => { if(mouseDown){ mouseDown = false; onEnd(e.clientX, e.clientY); }});

// Keyboard navigation
window.addEventListener('keydown', e => {
  if(e.key === 'ArrowUp')   goToIndex(currentIndex - 1);
  if(e.key === 'ArrowDown') goToIndex(currentIndex + 1);
  if(e.key === 'ArrowLeft' || e.key === 'ArrowRight') toggleFlip();
  if(e.key === ' ') { e.preventDefault(); incrementCounter(); }
});

/* =========================================
   RESET ALL STORAGE
   ========================================= */
function resetAllState(){
  athkarCollections.forEach((_, i) => {
    localStorage.removeItem(`${LS_COUNTERS}_${i}`);
    localStorage.removeItem(`${LS_INDEX}_${i}`);
  });
  localStorage.removeItem(LS_FILE);

  counters = new Array(cardsData.length).fill(0);
  const shouldAnimate = currentIndex > 0;
  currentIndex = 0;
  saveState();

  if(shouldAnimate){
    animateToIndex(0, 'down');
  } else {
    render();
  }
}

if(resetAllBtn){
  resetAllBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetAllState();
  });
}

/* =========================================
   INIT
   ========================================= */
(async function init(){
  const ok = await loadAllCollections();
  if(!ok) return;

  buildDropdown();

  const defaultIdx = getDefaultFileIndex();
  switchCollection(defaultIdx);
})();
