/* =====================================================
   Athkar App — script.js
   
   HOW TO MODIFY:
   ─────────────
   1. Add new athkar collections:
      • Create a new JSON file in the /data folder
      • Follow the same structure as morning.json / evening.json
      • Add its filename to the ATHKAR_FILES array below
      
   2. JSON file structure:
      {
        "title": "عنوان الأذكار",     ← title shown in the dropdown
        "theme": "morning" or "evening", ← controls background theme
        "athkar": [
          {
            "text": "نص الذكر",        ← the thiker (front face)
            "num": 3,                   ← number of times to repeat
            "fadhel": "فضل الذكر"      ← (OPTIONAL) shown on back face; if omitted, card won't flip
          }
        ]
      }

   3. Theme values:
      • "morning" → blue sky + animated clouds
      • "evening" → night sky with stars + moon

   4. Default selection logic:
      • 3:00 AM – 2:59 PM → first file with theme "morning"
      • 3:00 PM – 2:59 AM → first file with theme "evening"
   
   5. Night sky image: replace /images/night-sky.svg with your own
   6. Fonts: put .woff2 files in /fonts and add @font-face in styles.css
   ===================================================== */

// ── List of JSON files in /data folder ──
// Add new filenames here when you create new athkar collections
const ATHKAR_FILES = [
  'morning.json',
  'evening.json'
];

// ── State ──
let athkarCollections = [];   // loaded JSON data for each file
let currentFileIndex = 0;     // which collection is active
let cardsData = [];           // current collection's athkar array
let counters = [];            // per-card counter
let currentIndex = 0;         // which card is showing
let isFlipped = false;
let isAnimating = false;      // prevent overlapping animations
let nightParallaxOffset = 0;  // for night bg parallax

// ── DOM refs ──
const cardOuter   = document.getElementById('card');
const cardIndexEl = document.getElementById('cardIndex');
const titleEl     = document.getElementById('athkarTitle');
const dropdownEl  = document.getElementById('dropdownMenu');
const arrowEl     = document.getElementById('dropdownArrow');
const nightBgEl   = document.getElementById('nightBg');
const hintUp      = document.getElementById('hintUp');
const hintDown    = document.getElementById('hintDown');
const hintLeft    = document.getElementById('hintLeft');
const hintRight   = document.getElementById('hintRight');

// ── LocalStorage ──
const LS_COUNTERS = 'athkar_counters_v2';
const LS_INDEX    = 'athkar_cardindex_v2';
const LS_FILE     = 'athkar_file_v2';

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
  // Check saved preference first
  const saved = localStorage.getItem(LS_FILE);
  if(saved !== null){
    const idx = parseInt(saved, 10);
    if(!isNaN(idx) && idx >= 0 && idx < athkarCollections.length) return idx;
  }
  // Auto-select by time: 3AM–2:59PM → morning, 3PM–2:59AM → evening
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
  
  // Apply theme
  document.body.className = col.theme === 'evening' ? 'theme-evening' : 'theme-morning';
  titleEl.textContent = col.title;
  
  // Reset state
  currentIndex = 0;
  isFlipped = false;
  counters = new Array(cardsData.length).fill(0);
  
  // Load saved counters for this collection
  loadState();
  
  // Render
  render();
  updateDropdownUI();
  updateHintArrows();
  
  // Setup/teardown background
  if(col.theme === 'morning') setupCloudCanvas();
  else stopCloudCanvas();
  
  // Save file preference
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

  const wrapper = document.createElement('div');
  wrapper.className = 'card-wrap';
  if(!hasFadhel) wrapper.classList.add('flip-disabled');

  const card = document.createElement('div');
  card.className = 'card';

  // ── FRONT FACE ──
  const front = document.createElement('div');
  front.className = 'face front';
  const frontText = document.createElement('div');
  frontText.className = 'text-large';
  frontText.textContent = data.text;
  front.appendChild(frontText);

  // ── BACK FACE (only if fadhel exists) ──
  if(hasFadhel){
    const back = document.createElement('div');
    back.className = 'face back';
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
  controls.className = 'controls';

  const counterWrap = document.createElement('div');
  counterWrap.className = 'counter';

  // SVG circular progress
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 68 68');
  const bgCircle = document.createElementNS(svgNS, 'circle');
  bgCircle.setAttribute('cx', '34');
  bgCircle.setAttribute('cy', '34');
  bgCircle.setAttribute('r', '28');
  bgCircle.setAttribute('class', 'bg-circle');
  const progCircle = document.createElementNS(svgNS, 'circle');
  progCircle.setAttribute('cx', '34');
  progCircle.setAttribute('cy', '34');
  progCircle.setAttribute('r', '28');
  progCircle.setAttribute('class', 'progress-circle');
  svg.appendChild(bgCircle);
  svg.appendChild(progCircle);

  const circleWrap = document.createElement('div');
  circleWrap.className = 'counter-circle';
  circleWrap.appendChild(svg);

  const inner = document.createElement('div');
  inner.className = 'inner';
  const val = document.createElement('div');
  val.className = 'value';
  val.textContent = counters[index];
  inner.appendChild(val);
  circleWrap.appendChild(inner);

  // Reset button
  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn reset';
  resetBtn.innerHTML = '↺';
  resetBtn.title = 'إعادة تعيين';
  resetBtn.addEventListener('click', (ev) => { ev.stopPropagation(); resetCounter(); });

  counterWrap.appendChild(circleWrap);
  controls.appendChild(counterWrap);
  controls.appendChild(resetBtn);

  wrapper.appendChild(card);
  wrapper.appendChild(controls);

  // Tap to increment (only if not a drag/swipe)
  wrapper.addEventListener('click', () => {
    if(movedDuringTouch) return;
    incrementCounter();
  });

  // Initial SVG fill
  updateCircle(circleWrap, index);

  return wrapper;
}

/* =========================================
   UPDATE SVG CIRCLE
   ========================================= */
function updateCircle(circleEl, index){
  if(!circleEl) return;
  const current = counters[index] || 0;
  const max = cardsData[index].num || 1;
  const ratio = Math.min(1, current / max);
  const prog = circleEl.querySelector('.progress-circle');
  if(!prog) return;
  const r = 28;
  const c = 2 * Math.PI * r;
  prog.style.strokeDasharray = `${c}`;
  prog.style.strokeDashoffset = `${c * (1 - ratio)}`;
  const valEl = circleEl.querySelector('.value');
  if(valEl) valEl.textContent = current;
}

/* =========================================
   RENDER
   ========================================= */
function render(){
  cardOuter.innerHTML = '';
  isFlipped = false;
  const el = createCardElement(currentIndex);
  cardOuter.appendChild(el);
  el.id = 'activeCard';
  updateFooter();
  updateResetState();
  updateHintArrows();
}

function updateFooter(){
  const total = cardsData.length;
  const pct = total > 1 ? (currentIndex / (total - 1)) * 100 : 100;
  cardIndexEl.innerHTML = `
    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    <div class="card-info">${currentIndex + 1} / ${total}</div>
  `;
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
    const circle = wrap.querySelector('.counter-circle');
    updateCircle(circle, currentIndex);
  }
  updateResetState();
  saveState();

  // Auto-advance when counter reaches max
  if(counters[currentIndex] >= max){
    setTimeout(() => {
      if(currentIndex < cardsData.length - 1){
        goToIndex(currentIndex + 1);
      } else {
        // All cards done — show completion
        showCompletion();
      }
    }, 500);
  }
}

function resetCounter(){
  counters[currentIndex] = 0;
  const wrap = document.getElementById('activeCard');
  if(wrap){
    const circle = wrap.querySelector('.counter-circle');
    updateCircle(circle, currentIndex);
  }
  updateResetState();
  saveState();
}

function updateResetState(){
  const resetBtn = document.querySelector('#activeCard .btn.reset');
  if(resetBtn) resetBtn.disabled = counters[currentIndex] <= 0;
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
   NAVIGATION
   ========================================= */
function goToIndex(idx){
  if(isAnimating) return;
  if(idx < 0 || idx >= cardsData.length || idx === currentIndex) return;
  const dir = idx > currentIndex ? 'up' : 'down';
  animateToIndex(idx, dir);
}

function animateToIndex(newIndex, direction){
  isAnimating = true;
  const currentWrap = document.getElementById('activeCard');
  const newWrap = createCardElement(newIndex);

  // Night bg parallax
  if(document.body.classList.contains('theme-evening')){
    nightParallaxOffset += direction === 'up' ? -8 : 8;
    nightBgEl.style.transform = `translateY(${nightParallaxOffset}px)`;
  }

  newWrap.style.transform = `translateY(${direction === 'up' ? '100%' : '-100%'})`;
  newWrap.style.opacity = '0';
  cardOuter.appendChild(newWrap);

  // Force reflow
  void newWrap.offsetHeight;

  requestAnimationFrame(() => {
    if(currentWrap){
      currentWrap.style.transform = `translateY(${direction === 'up' ? '-100%' : '100%'})`;
      currentWrap.style.opacity = '0';
    }
    newWrap.style.transform = 'translateY(0)';
    newWrap.style.opacity = '1';
  });

  setTimeout(() => {
    if(currentWrap && currentWrap.parentNode) currentWrap.remove();
    newWrap.id = 'activeCard';
    isFlipped = false;
    currentIndex = newIndex;
    updateFooter();
    updateResetState();
    updateHintArrows();
    saveState();
    isAnimating = false;
  }, 400);
}

/* =========================================
   FLIP
   ========================================= */
function toggleFlip(){
  // Don't flip if no fadhel
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
  // Up: hide if at first card
  hintUp.classList.toggle('hidden', currentIndex <= 0);
  // Down: hide if at last card
  hintDown.classList.toggle('hidden', currentIndex >= cardsData.length - 1);
  // Left/Right: hide if no fadhel (can't flip)
  const hasFadhel = !!cardsData[currentIndex]?.fadhel;
  hintLeft.classList.toggle('hidden', !hasFadhel);
  hintRight.classList.toggle('hidden', !hasFadhel);
}

/* =========================================
   SWIPE / TOUCH / MOUSE
   ========================================= */
let startX = 0, startY = 0, isTouching = false, movedDuringTouch = false;
const H_THRESH = 40, V_THRESH = 40;

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
  if(Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > H_THRESH){
    toggleFlip();
  } else if(Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > V_THRESH){
    if(dy < 0) goToIndex(currentIndex + 1);
    else goToIndex(currentIndex - 1);
  }
}

cardOuter.addEventListener('touchstart', e => { const t = e.changedTouches[0]; onStart(t.clientX, t.clientY); }, {passive: true});
cardOuter.addEventListener('touchmove', e => { const t = e.changedTouches[0]; onMove(t.clientX, t.clientY); e.preventDefault(); }, {passive: false});
cardOuter.addEventListener('touchend', e => { const t = e.changedTouches[0]; onEnd(t.clientX, t.clientY); });

let mouseDown = false;
cardOuter.addEventListener('mousedown', e => { mouseDown = true; onStart(e.clientX, e.clientY); });
window.addEventListener('mousemove', e => { if(mouseDown) onMove(e.clientX, e.clientY); });
window.addEventListener('mouseup', e => { if(mouseDown){ mouseDown = false; onEnd(e.clientX, e.clientY); }});

window.addEventListener('keydown', e => {
  if(e.key === 'ArrowUp')    goToIndex(currentIndex + 1);
  if(e.key === 'ArrowDown')  goToIndex(currentIndex - 1);
  if(e.key === 'ArrowLeft' || e.key === 'ArrowRight') toggleFlip();
});

/* =========================================
   CLOUD CANVAS (morning theme)
   ========================================= */
let cloudAnimId = null;

function setupCloudCanvas(){
  // Don't double-init
  if(cloudAnimId) return;
  
  const canvas = document.getElementById('cloudCanvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  let time = 0;

  const clouds = [
    { x: 0.05, y: 0.08, size: 80, speed: 0.0003, offset: 0 },
    { x: 0.25, y: 0.14, size: 60, speed: 0.00025, offset: Math.PI },
    { x: 0.48, y: 0.10, size: 95, speed: 0.00035, offset: Math.PI * 0.5 },
    { x: 0.72, y: 0.18, size: 70, speed: 0.0002, offset: Math.PI * 1.5 },
    { x: 0.90, y: 0.12, size: 75, speed: 0.00028, offset: Math.PI * 0.25 },
    { x: 0.15, y: 0.25, size: 55, speed: 0.00022, offset: Math.PI * 0.75 },
    { x: 0.60, y: 0.22, size: 65, speed: 0.00032, offset: Math.PI * 1.25 }
  ];

  function draw(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    time++;
    clouds.forEach(c => {
      const px = c.x * canvas.width + Math.sin(time * c.speed + c.offset) * 120;
      const py = c.y * canvas.height;
      drawCloud(ctx, px, py, c.size);
    });
    cloudAnimId = requestAnimationFrame(draw);
  }

  function drawCloud(ctx, x, y, s){
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    const parts = [
      [-0.35, 0, 0.45], [-0.05, -0.18, 0.55],
      [0.30, -0.05, 0.50], [0.55, 0.10, 0.40], [0.10, 0.08, 0.38]
    ];
    parts.forEach(([ox, oy, r]) => {
      ctx.beginPath();
      ctx.arc(x + s * ox, y + s * oy, s * r, 0, Math.PI * 2);
      ctx.fill();
    });
    // Bottom shadow
    const g = ctx.createLinearGradient(x, y - s * 0.1, x, y + s * 0.35);
    g.addColorStop(0, 'rgba(180,210,240,0)');
    g.addColorStop(1, 'rgba(140,180,220,0.08)');
    ctx.fillStyle = g;
    ctx.fillRect(x - s * 0.6, y + s * 0.05, s * 1.2, s * 0.35);
  }

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  draw();
}

function stopCloudCanvas(){
  if(cloudAnimId){
    cancelAnimationFrame(cloudAnimId);
    cloudAnimId = null;
    const canvas = document.getElementById('cloudCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
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
