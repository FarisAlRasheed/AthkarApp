/* =====================================================
   Athkar App — script.js  (Full rewrite v3)
   ===================================================== */

// ── LocalStorage keys ──
// Declared before any function that reads them. They used to sit ~30 lines
// below hasCollectionProgress(), which made that function a temporal-dead-zone
// ReferenceError waiting for someone to reorder the file.
const LS_COUNTERS = 'athkar_counters_v2';
const LS_INDEX    = 'athkar_cardindex_v2';
const LS_CITY     = 'athkar_city_v3';
const LS_PRAYER_CACHE = 'cached_prayer_times';


// ── State ──
let sheikhConfigs = {};
let currentCategoryId = null;
let currentCollectionTitle = '';
let cardsData = [];
let counters = [];
let currentIndex = 0;
let isFlipped = false;
let currentVoiceDir = 'voices';

// Animation management
let animationTimer = null;
let advanceTimer = null;
let activeAudio = null;
let audioAnimFrame = null;

// ── Prayer times state ──
function todayStamp(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// The cache used to store bare timings with no date and no city. They were
// restored unconditionally and re-anchored to `new Date()`, so last week's
// times — or another city's — silently presented as today's.
let cachedPrayerTimes = null;
let cachedPrayerStamp = null;
let cachedPrayerCity = null;
try {
  const saved = JSON.parse(localStorage.getItem(LS_PRAYER_CACHE) || 'null');
  if (saved && saved.timings) {
    cachedPrayerTimes = saved.timings;
    cachedPrayerStamp = saved.date || null;
    cachedPrayerCity  = saved.city || null;
  }
} catch (e) {}

/** True when the cache is for today and for the city we're about to display. */
function isPrayerCacheFresh(cityStr){
  return !!cachedPrayerTimes
    && cachedPrayerStamp === todayStamp()
    && (!cityStr || cachedPrayerCity === cityStr);
}
let prayerCountdownInterval = null;

function hasCollectionProgress(categoryId){
  if (!categoryId) return false;
  const idxRaw = localStorage.getItem(`${LS_INDEX}_${categoryId}`);
  const countersRaw = localStorage.getItem(`${LS_COUNTERS}_${categoryId}`);
  return (idxRaw !== null && parseInt(idxRaw, 10) > 0) || countersRaw !== null;
}

function resetCollectionProgress(categoryId){
  if (!categoryId) return;
  localStorage.removeItem(`${LS_COUNTERS}_${categoryId}`);
  localStorage.removeItem(`${LS_INDEX}_${categoryId}`);
}

// ── DOM refs ──
const dynamicBgEl  = document.getElementById('dynamicBg');
const cardOuter    = document.getElementById('card');
const titleEl      = document.getElementById('athkarTitle');
const dropdownEl   = document.getElementById('dropdownMenu');
const arrowEl      = document.getElementById('dropdownArrow');
const prayerSummaryBtn = document.getElementById('prayerSummaryBtn');
const prayerSummaryName = document.getElementById('prayerSummaryName');
const prayerSummaryTime = document.getElementById('prayerSummaryTime');
const prayerDropdownMenu = document.getElementById('prayerDropdownMenu');
const topPrayerCountdown = document.getElementById('topPrayerCountdown');
const athkarDropdownBtn = document.getElementById('athkarDropdownBtn');
const hintUp       = document.getElementById('hintUp');
const hintDown     = document.getElementById('hintDown');
const hintLeft     = document.getElementById('hintLeft');
const hintRight    = document.getElementById('hintRight');

let prayerCityExpanded = false;

// ── Quranic character detection ──
const QURAN_CHARS = /[\u0671\u06D6-\u06ED\u08D4-\u08E1\u0615-\u061A\uFD3E\uFD3F\u0670]/;
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

function isDarkCardTheme(){
  return document.body.classList.contains('theme-fajr')
    || document.body.classList.contains('theme-maghrib')
    || document.body.classList.contains('theme-isha')
    || document.body.classList.contains('theme-evening');
}

/* =========================================
   ARABIC/HINDI DIGITS
   ========================================= */
const ARABIC_DIGITS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
function toArabicDigits(value){
  return String(value).replace(/\d/g, d => ARABIC_DIGITS[Number(d)]);
}

/* =========================================
   HAPTIC FEEDBACK (improved)
   ========================================= */
function triggerHaptic(intensity = 'light'){
  // Try navigator.vibrate first
  if(navigator.vibrate){
    try{
      if(intensity === 'light') navigator.vibrate(12);
      else if(intensity === 'strong') navigator.vibrate([20, 40, 20]);
    }catch(e){}
  }
}

/* =========================================
   PRAYER TIMES API
   ========================================= */
const PRAYER_NAMES = {
  Fajr: 'الفجر',
  Sunrise: 'الشروق',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء'
};

const PRAYER_KEYS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

async function fetchPrayerTimes(cityStr){
  const today = new Date();
  const dd = String(today.getDate()).padStart(2,'0');
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const yyyy = today.getFullYear();
  
  let url;
  if (cityStr && cityStr.startsWith('gps:')) {
    const [lat, lng] = cityStr.slice(4).split(',');
    url = `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat.trim()}&longitude=${lng.trim()}&method=4`;
  } else {
    const [city, country] = cityStr.split(',');
    url = `https://api.aladhan.com/v1/timingsByCity/${dd}-${mm}-${yyyy}?city=${encodeURIComponent(city.trim())}&country=${encodeURIComponent(country.trim())}&method=4`;
  }
  
  try{
    const res = await fetch(url);
    const data = await res.json();
    if(data.code === 200 && data.data){
      cachedPrayerTimes = data.data.timings;
      cachedPrayerStamp = todayStamp();
      cachedPrayerCity  = cityStr || null;
      try {
        localStorage.setItem(LS_PRAYER_CACHE, JSON.stringify({
          date: cachedPrayerStamp,
          city: cachedPrayerCity,
          timings: cachedPrayerTimes
        }));
      } catch (e) {}
      return data.data;
    }
  }catch(e){
    console.warn('Prayer times fetch failed:', e);
  }
  // Offline or API failure: fall back to the cache, but only report success
  // when it is actually for today and this city.
  if(isPrayerCacheFresh(cityStr)) return { timings: cachedPrayerTimes };
  return null;
}

function parsePrayerTime(timeStr){
  // Format "HH:MM" or "HH:MM (timezone)"
  const clean = timeStr.replace(/\s*\(.*\)/, '').trim();
  const [h, m] = clean.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function getCurrentPeriod(timings){
  if(!timings) return 'isha';
  const now = new Date();
  const fajr = parsePrayerTime(timings.Fajr);
  const sunrise = parsePrayerTime(timings.Sunrise);
  const dhuhr = parsePrayerTime(timings.Dhuhr);
  const asr = parsePrayerTime(timings.Asr);
  const maghrib = parsePrayerTime(timings.Maghrib);
  const isha = parsePrayerTime(timings.Isha);
  
  if(now >= isha) return 'isha';
  if(now >= maghrib) return 'maghrib';
  if(now >= asr) return 'asr';
  if(now >= dhuhr) return 'dhuhr';
  if(now >= sunrise) return 'dhuhr'; // between sunrise and dhuhr - still daytime
  if(now >= fajr) return 'fajr';
  return 'isha'; // before fajr
}

function getNextPrayer(timings){
  if(!timings) return null;
  const now = new Date();
  for(const key of ['Fajr','Dhuhr','Asr','Maghrib','Isha']){
    const t = parsePrayerTime(timings[key]);
    if(now < t) return { name: PRAYER_NAMES[key], key, time: t };
  }
  // After Isha: next is tomorrow's Fajr
  const tomorrow = parsePrayerTime(timings.Fajr);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { name: PRAYER_NAMES.Fajr, key: 'Fajr', time: tomorrow };
}

// Arabic-only app: use ص/م and Arabic-Indic digits, matching main-menu.js.
// This used to emit "3:24 PM" while the main menu showed "٣:٢٤ م" for the
// same timing.
function formatShortPrayerTime(timeStr){
  if (!timeStr) return toArabicDigits('--:--');
  const [hours, minutes] = timeStr.replace(/\s*\(.*\)/, '').trim().split(':').map(Number);
  if(!Number.isFinite(hours) || !Number.isFinite(minutes)) return toArabicDigits('--:--');
  const period = hours >= 12 ? 'م' : 'ص';
  const h12 = hours % 12 || 12;
  return toArabicDigits(`${h12}:${String(minutes).padStart(2, '0')}`) + ' ' + period;
}

function getSelectedCityLabel(){
  if (citySelect && citySelect.value && citySelect.value.startsWith('gps:')) {
    return 'موقعي الحالي';
  }
  if(!citySelect || !citySelect.selectedOptions || !citySelect.selectedOptions[0]) return 'المدينة';
  return citySelect.selectedOptions[0].textContent.trim();
}

function syncCityButtons(){
  const saved = localStorage.getItem(LS_CITY);
  if(citySelect && saved && citySelect.value !== saved){
    if (saved.startsWith('gps:') && !Array.from(citySelect.options).some(o => o.value === saved)) {
      const opt = document.createElement('option');
      opt.textContent = 'موقعي الحالي';
      opt.value = saved;
      citySelect.appendChild(opt);
    }
    citySelect.value = saved;
  }
}

function buildPrayerMenu(timings){
  if(!prayerDropdownMenu) return;
  prayerDropdownMenu.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'prayer-menu-header';
  header.textContent = 'مواقيت الصلاة';
  prayerDropdownMenu.appendChild(header);

  const nextKey = getNextPrayer(timings)?.key;
  PRAYER_KEYS.forEach((key) => {
    if(!timings[key]) return;
    const row = document.createElement('div');
    row.className = 'prayer-menu-item' + (key === nextKey ? ' active' : '');
    row.innerHTML = `<span class="prayer-menu-name">${PRAYER_NAMES[key]}</span><span class="prayer-menu-time">${formatShortPrayerTime(timings[key])}</span>`;
    prayerDropdownMenu.appendChild(row);
  });

  const divider = document.createElement('div');
  divider.className = 'prayer-menu-divider';
  prayerDropdownMenu.appendChild(divider);

  const cityToggleBtn = document.createElement('button');
  cityToggleBtn.type = 'button';
  cityToggleBtn.className = 'prayer-menu-city-btn';
  cityToggleBtn.textContent = `المدينة: ${getSelectedCityLabel()}`;
  cityToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    prayerCityExpanded = !prayerCityExpanded;
    buildPrayerMenu(timings);
    prayerDropdownMenu.classList.add('open');
  });
  prayerDropdownMenu.appendChild(cityToggleBtn);

  if(prayerCityExpanded && citySelect){
    const cityList = document.createElement('div');
    cityList.className = 'prayer-city-list';
    Array.from(citySelect.options).forEach((option) => {
      const cityItem = document.createElement('button');
      cityItem.type = 'button';
      cityItem.className = 'prayer-city-item' + (option.value === citySelect.value ? ' active' : '');
      cityItem.textContent = option.textContent;
      cityItem.addEventListener('click', (e) => {
        e.stopPropagation();
        citySelect.value = option.value;
        localStorage.setItem(LS_CITY, option.value);
        prayerCityExpanded = false;
        loadPrayerTimes();
      });
      cityList.appendChild(cityItem);
    });
    prayerDropdownMenu.appendChild(cityList);
  }
}

function updatePrayerSummary(nextP){
  if(!nextP) return;
  if(prayerSummaryName) prayerSummaryName.textContent = nextP.name;
  if(prayerSummaryTime){
    const t = nextP.time;
    prayerSummaryTime.textContent = t
      ? formatShortPrayerTime(`${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`)
      : toArabicDigits('--:--');
  }
}

function updateCountdownDisplay(nextP){
  if(!nextP) return;
  const now = new Date();
  let diff = nextP.time - now;
  if(diff < 0) diff = 0;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const text = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  if(topPrayerCountdown) topPrayerCountdown.textContent = text;
  if(nextPrayerCountdown) nextPrayerCountdown.textContent = text;
  if(diff <= 0){
    if(topPrayerCountdown) topPrayerCountdown.textContent = 'حان الآن';
    if(nextPrayerCountdown) nextPrayerCountdown.textContent = 'حان الآن';
  }
}

/* =========================================
   DYNAMIC BACKGROUND SYSTEM
   ========================================= */
const THEME_PERIODS = ['fajr','morning','daytime','dhuhr','asr','maghrib','evening','isha','nighttime'];

function applyDynamicBackground(period){
  // Was `document.body.className = themeClass`, which erased every other class
  // on <body> — including `menu-active` (main menu visibility) and
  // `theme-nighttime-body` (set by main-menu.js). Swap only the theme class.
  THEME_PERIODS.forEach(p => document.body.classList.remove(`theme-${p}`));
  document.body.classList.add(`theme-${period}`);
  document.body.dataset.bgPeriod = period;
}

function getActiveBackgroundPeriod(){
  if(!currentCategoryId) return getCurrentPeriod(cachedPrayerTimes);

  const isPostPrayerCollection = currentCategoryId === 'post-prayer';
  if(isPostPrayerCollection){
    return getCurrentPeriod(cachedPrayerTimes);
  }

  if(currentCategoryId === 'sleep'){
    return 'isha';
  }

  if(currentCategoryId === 'morning') return 'morning';
  if(currentCategoryId === 'evening') return 'evening';

  return getCurrentPeriod(cachedPrayerTimes);
}

function updateBackgroundForTime(){
  const period = getActiveBackgroundPeriod();
  applyDynamicBackground(period);
}

/* =========================================
   PARALLAX — dynamic scroll speed
   ========================================= */
function updateParallax(){
  if(!dynamicBgEl) return;
  dynamicBgEl.style.transform = 'translateY(0)';
}

/* =========================================
   VOICE / AUDIO SYSTEM (improved)
   ========================================= */
let playbackSpeed = 1.0;
const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 1.75, 2];

function resolveVoiceSrc(voice){
  // README documents the array form ("voice": ["a.m4a","b.m4a"]); calling
  // .startsWith() on an array threw. Take the first entry.
  if(Array.isArray(voice)) voice = voice[0];
  if(!voice || typeof voice !== 'string') return null;
  if(voice.startsWith('http') || voice.startsWith('/')) return voice;
  return `${currentVoiceDir}/${voice}`;
}

function stopAndResetAudio(){
  if(activeAudio){
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if(audioAnimFrame){
    cancelAnimationFrame(audioAnimFrame);
    audioAnimFrame = null;
  }
  // Reset all play buttons
  document.querySelectorAll('.play-btn').forEach(btn => { btn.innerHTML = '▶'; });
  document.querySelectorAll('.audio-progress-ring.active').forEach(r => r.classList.remove('active'));
  document.querySelectorAll('.speed-drawer.open').forEach(d => d.classList.remove('open'));
  document.querySelectorAll('.speed-btn').forEach(b => { b.style.display = 'none'; });
}

function playVoice(voice, playBtn, speedBtn){
  const src = resolveVoiceSrc(voice);
  if(!src) return;
  
  const getRing = () => playBtn ? playBtn.parentElement.querySelector('.audio-progress-ring') : null;
  const getProgCircle = () => {
    const ring = getRing();
    return ring ? ring.querySelectorAll('circle')[1] : null;
  };
  
  if(activeAudio && !activeAudio.paused){
    activeAudio.pause();
    if(playBtn) playBtn.innerHTML = '▶';
    if(speedBtn) speedBtn.style.display = 'none';
    // Close speed drawer
    const drawer = playBtn?.parentElement?.parentElement?.querySelector('.speed-drawer');
    if(drawer) drawer.classList.remove('open');
    return;
  }
  
  if(activeAudio && activeAudio.paused && activeAudio.currentTime > 0){
    // Compare the fully-resolved URL. endsWith(voice) was a substring test:
    // "021.m4a".endsWith("1.m4a") is true, so it could resume the wrong clip.
    const currentSrc = activeAudio.src;
    if(currentSrc && currentSrc === new URL(src, document.baseURI).href){
      activeAudio.play().catch(() => {});
      if(playBtn) playBtn.innerHTML = '⏸';
      if(speedBtn) speedBtn.style.display = 'flex';
      const ring = getRing();
      if(ring) ring.classList.add('active');
      startSmoothProgress(getProgCircle());
      return;
    }
  }
  
  // New audio
  stopAndResetAudio();
  
  activeAudio = new Audio(src);
  activeAudio.playbackRate = playbackSpeed;
  
  const circumference = 2 * Math.PI * 21;
  
  if(playBtn){
    playBtn.innerHTML = '⏸';
    const ring = getRing();
    const progCircle = getProgCircle();
    if(ring && progCircle){
      progCircle.style.strokeDasharray = `${circumference}`;
      progCircle.style.strokeDashoffset = `${circumference}`;
      ring.classList.add('active');
      startSmoothProgress(progCircle);
    }
  }
  
  if(speedBtn) speedBtn.style.display = 'flex';
  
  activeAudio.addEventListener('ended', () => {
    if(playBtn) playBtn.innerHTML = '▶';
    if(speedBtn) speedBtn.style.display = 'none';
    const ring = getRing();
    const progCircle = getProgCircle();
    if(ring) ring.classList.remove('active');
    if(progCircle) progCircle.style.strokeDashoffset = `${circumference}`;
    if(audioAnimFrame){ cancelAnimationFrame(audioAnimFrame); audioAnimFrame = null; }
    // Close speed drawer
    const drawer = playBtn?.parentElement?.parentElement?.querySelector('.speed-drawer');
    if(drawer) drawer.classList.remove('open');
    activeAudio = null;
  });
  
  activeAudio.addEventListener('error', (e) => {
    console.error('Audio error:', src, e);
    if(playBtn) playBtn.innerHTML = '▶';
    if(speedBtn) speedBtn.style.display = 'none';
    const ring = getRing();
    if(ring) ring.classList.remove('active');
    activeAudio = null;
  });
  
  activeAudio.play().catch(() => {
    if(playBtn) playBtn.innerHTML = '▶';
    if(speedBtn) speedBtn.style.display = 'none';
    const ring = getRing();
    if(ring) ring.classList.remove('active');
    activeAudio = null;
  });
}

/* Smooth progress ring using rAF instead of timeupdate */
function startSmoothProgress(progCircle){
  if(!progCircle) return;
  if(audioAnimFrame) cancelAnimationFrame(audioAnimFrame);
  
  const circumference = 2 * Math.PI * 21;
  
  function tick(){
    if(!activeAudio || activeAudio.paused){
      return;
    }
    if(activeAudio.duration){
      const progress = activeAudio.currentTime / activeAudio.duration;
      const offset = circumference * (1 - progress);
      progCircle.style.strokeDashoffset = `${offset}`;
    }
    audioAnimFrame = requestAnimationFrame(tick);
  }
  audioAnimFrame = requestAnimationFrame(tick);
}

/* Seamless speed change — no pause/reset */
function setPlaybackSpeed(speed){
  playbackSpeed = speed;
  if(activeAudio){
    activeAudio.playbackRate = speed;
    // No pause/reset — instant change
  }
  // Update all speed button labels
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.textContent = `${speed}x`;
  });
  // Update drawer active states
  document.querySelectorAll('.speed-drawer-option').forEach(opt => {
    opt.classList.toggle('active', parseFloat(opt.dataset.speed) === speed);
  });
}

/* Helper: create play button with ring + speed drawer */
function createPlayButton(voice){
  const playBtnWrap = document.createElement('div');
  playBtnWrap.className = 'play-btn-wrap';
  playBtnWrap.style.position = 'relative';
  
  const svgNS = 'http://www.w3.org/2000/svg';
  const progressRing = document.createElementNS(svgNS, 'svg');
  progressRing.setAttribute('class', 'audio-progress-ring');
  progressRing.setAttribute('viewBox', '0 0 48 48');
  const bgCircle = document.createElementNS(svgNS, 'circle');
  bgCircle.setAttribute('cx', '24');
  bgCircle.setAttribute('cy', '24');
  bgCircle.setAttribute('r', '21');
  bgCircle.setAttribute('fill', 'none');
  bgCircle.setAttribute('stroke', 'rgba(58,122,189,0.2)');
  bgCircle.setAttribute('stroke-width', '2');
  const progCircle = document.createElementNS(svgNS, 'circle');
  progCircle.setAttribute('cx', '24');
  progCircle.setAttribute('cy', '24');
  progCircle.setAttribute('r', '21');
  progCircle.setAttribute('fill', 'none');
  progCircle.setAttribute('stroke', '#0b84ff');
  progCircle.setAttribute('stroke-width', '3');
  progCircle.setAttribute('stroke-linecap', 'round');
  progCircle.style.transform = 'rotate(-90deg)';
  progCircle.style.transformOrigin = 'center';
  progCircle.style.transition = 'stroke-dashoffset 0.05s linear';
  const circumference = 2 * Math.PI * 21;
  progCircle.style.strokeDasharray = `${circumference}`;
  progCircle.style.strokeDashoffset = `${circumference}`;
  progressRing.appendChild(bgCircle);
  progressRing.appendChild(progCircle);
  playBtnWrap.appendChild(progressRing);
  
  const playBtn = document.createElement('button');
  playBtn.className = 'play-btn';
  playBtn.innerHTML = '▶';
  playBtn.title = 'تشغيل الصوت';
  playBtnWrap.appendChild(playBtn);
  
  // Speed toggle button
  const speedBtn = document.createElement('button');
  speedBtn.className = 'speed-btn';
  speedBtn.textContent = `${playbackSpeed}x`;
  speedBtn.title = 'سرعة التشغيل';
  speedBtn.style.display = 'none';
  
  // Speed drawer (slides out from speed button)
  const speedDrawer = document.createElement('div');
  speedDrawer.className = 'speed-drawer';
  SPEED_OPTIONS.forEach(s => {
    const opt = document.createElement('button');
    opt.className = 'speed-drawer-option' + (s === playbackSpeed ? ' active' : '');
    opt.textContent = `${s}x`;
    opt.dataset.speed = s;
    opt.addEventListener('click', (ev) => {
      ev.stopPropagation();
      setPlaybackSpeed(s);
      setTimeout(() => speedDrawer.classList.remove('open'), 200);
    });
    speedDrawer.appendChild(opt);
  });
  
  speedBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    speedDrawer.classList.toggle('open');
  });
  
  playBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    playVoice(voice, playBtn, speedBtn);
  });
  
  return { wrap: playBtnWrap, speedBtn, speedDrawer };
}

/* =========================================
   LOAD SHEIKH CONFIGS
   ========================================= */
async function loadSheikhConfigs(){
  try {
    const r = await fetch('data/sheikh_configs.json');
    if(r.ok) {
      sheikhConfigs = await r.json();
    } else {
      console.warn('sheikh_configs.json not found');
    }
  } catch(e) {
    console.warn('Error loading sheikh_configs.json', e);
  }
  return true;
}

/* =========================================
   SWITCH COLLECTION
   ========================================= */
async function switchCollection(categoryId) {
  currentCategoryId = categoryId;
  const menuCat = window.MainMenu?.MENU_CATEGORIES.find(c => c.id === categoryId);
  currentCollectionTitle = menuCat ? menuCat.title : categoryId;

  const config = sheikhConfigs[categoryId];
  const selectedSheikh = localStorage.getItem('athkar_sheikh_' + categoryId);

  let poolData = null;
  let trackList = null;

  if (config) {
    const sheikhKey = selectedSheikh && config[selectedSheikh] ? selectedSheikh : Object.keys(config)[0];
    trackList = config[sheikhKey].track;
    const capitalCategory = categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
    try {
      const r = await fetch(`data/${capitalCategory}_pool.json`);
      if(r.ok) {
        poolData = await r.json();
      }
    } catch(e) {
      console.warn('Pool load failed', e);
    }
  }

  if (poolData && trackList) {
    // A track id with no pool entry used to render a card whose text read
    // "Error loading <id>" — an English error string shown mid-worship. Skip
    // the entry instead and warn; it reappears once the pool gains the id.
    const missingIds = [];
    cardsData = trackList.reduce((acc, id) => {
      const item = poolData.athkar_pool[id];
      if (item) acc.push(item);
      else missingIds.push(id);
      return acc;
    }, []);
    if (missingIds.length) {
      console.warn(`Collection "${categoryId}": ids missing from pool, skipped:`, missingIds);
    }
  } else {
    // Fallback to legacy
    const legacyFile = menuCat && menuCat.file ? menuCat.file : `${categoryId}.json`;
    try {
      const r = await fetch(`data/${legacyFile}`);
      if(r.ok) {
        const legacyData = await r.json();
        cardsData = legacyData.athkar;
        currentCollectionTitle = legacyData.title || currentCollectionTitle;
      } else {
        cardsData = [];
      }
    } catch(e) {
      console.warn('Legacy fallback failed', e);
      cardsData = [];
    }
  }

  currentVoiceDir = 'voices'; // always enforce flat directory

  // Apply dynamic background based on prayer times
  updateBackgroundForTime();

  titleEl.textContent = currentCollectionTitle;

  currentIndex = 0;
  isFlipped = false;
  counters = cardsData.map(card => card.num || 1);
  // Stop any playing audio
  stopAndResetAudio();

  loadState();
  render();
  updateDropdownUI();
  updateHintArrows();
  updateParallax();
}

/* =========================================
   DROPDOWN MENU
   ========================================= */
function buildDropdown(){
  dropdownEl.innerHTML = '';
  if(window.MainMenu?.MENU_CATEGORIES) {
    window.MainMenu.MENU_CATEGORIES.forEach((cat) => {
      if(!cat.file && cat.id !== 'tasbih' && !sheikhConfigs[cat.id]) return; // ignore if neither file nor config exists
      if(cat.id === 'tasbih') return; // ignore tasbih

      const opt = document.createElement('div');
      opt.className = 'dropdown-option' + (cat.id === currentCategoryId ? ' active' : '');
      opt.dataset.categoryId = cat.id;
      opt.textContent = cat.title;
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        closeDropdown();
        if(cat.id !== currentCategoryId) switchCollection(cat.id);
      });
      dropdownEl.appendChild(opt);
    });
  }

  const divider = document.createElement('div');
  divider.className = 'dropdown-divider';
  dropdownEl.appendChild(divider);

  const optionsOpt = document.createElement('div');
  optionsOpt.className = 'dropdown-option dropdown-option-secondary';
  optionsOpt.textContent = 'الخيارات';
  optionsOpt.addEventListener('click', (e) => {
    e.stopPropagation();
    closeDropdown();
    openOptionsMenu();
  });
  dropdownEl.appendChild(optionsOpt);
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
  opts.forEach((opt) => {
    if(opt.dataset.categoryId) {
      opt.classList.toggle('active', opt.dataset.categoryId === currentCategoryId);
    }
  });
}

function togglePrayerMenu(){
  if(!prayerDropdownMenu) return;
  const willOpen = !prayerDropdownMenu.classList.contains('open');
  if(willOpen){
    buildPrayerMenu(cachedPrayerTimes || {});
    prayerDropdownMenu.classList.add('open');
    closeDropdown();
  }else{
    prayerDropdownMenu.classList.remove('open');
    prayerCityExpanded = false;
  }
}

function closePrayerMenu(){
  if(prayerDropdownMenu) prayerDropdownMenu.classList.remove('open');
  prayerCityExpanded = false;
}

function closeAllTopMenus(){
  closeDropdown();
  closePrayerMenu();
  closeOptionsMenu();
}

if(athkarDropdownBtn){
  athkarDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
    closePrayerMenu();
  });
}
if(prayerSummaryBtn){
  prayerSummaryBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePrayerMenu();
  });
}
document.addEventListener('click', (e) => {
  if(!e.target.closest('.athkar-selector') && !e.target.closest('.prayer-selector') && !e.target.closest('.options-menu')){
    closeAllTopMenus();
  }
});

/* =========================================
   PERSISTENCE
   ========================================= */
function loadState(){
  try{
    const key = `${LS_COUNTERS}_${currentCategoryId}`;
    const raw = localStorage.getItem(key);
    if(raw){
      const parsed = JSON.parse(raw);
      if(Array.isArray(parsed)){
        for(let i = 0; i < Math.min(parsed.length, cardsData.length); i++){
          const max = cardsData[i]?.num || 1;
          const value = Number(parsed[i]);
          if(Number.isFinite(value) && value >= 0 && value <= max){
            counters[i] = value;
          }
        }
      }
    }
    const idxKey = `${LS_INDEX}_${currentCategoryId}`;
    const idxRaw = localStorage.getItem(idxKey);
    if(idxRaw != null){
      const n = Number(idxRaw);
      if(!isNaN(n) && n >= 0 && n < cardsData.length) currentIndex = n;
    }
  }catch(e){ console.warn('loadState error', e); }
}

function saveState(){
  try{
    localStorage.setItem(`${LS_COUNTERS}_${currentCategoryId}`, JSON.stringify(counters));
    localStorage.setItem(`${LS_INDEX}_${currentCategoryId}`, String(currentIndex));
  }catch(e){ console.warn('saveState error', e); }
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
  cardIndex.textContent = toArabicDigits(index + 1) + '/' + toArabicDigits(total);
  cardTop.appendChild(cardProgress);
  cardTop.appendChild(cardIndex);
  front.appendChild(cardTop);

  if(data.upperText){
    const upperText = document.createElement('div');
    upperText.className = 'upper-text';
    upperText.textContent = data.upperText;
    front.appendChild(upperText);
  }

  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'text-scroll-container';

  const rawText = data.text;
  const isQuran = isQuranicText(rawText);
  const { basmalah, rest } = splitBasmalah(rawText);

  if(basmalah){
    const basmalahEl = document.createElement('div');
    basmalahEl.className = 'basmalah';
    basmalahEl.textContent = basmalah;
    scrollContainer.appendChild(basmalahEl);
  }

  const frontText = document.createElement('div');
  frontText.className = 'text-large';
  if(isQuran) frontText.classList.add('quran-text');
  if(data.textColor && !isDarkCardTheme()){
    frontText.style.color = data.textColor;
  } else if(!isQuran) {
    frontText.style.color = isDarkCardTheme() ? '#f2f4ff' : '#1a1a1a';
  }
  frontText.textContent = rest;
  scrollContainer.appendChild(frontText);
  front.appendChild(scrollContainer);

  if(data.lowerText){
    const lowerText = document.createElement('div');
    lowerText.className = 'lower-text';
    lowerText.textContent = data.lowerText;
    front.appendChild(lowerText);
  }

  requestAnimationFrame(() => {
    if(scrollContainer.scrollHeight > scrollContainer.clientHeight + 4){
      scrollContainer.classList.add('has-overflow');
    }
  });

  // ── BACK FACE ──
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

  // ── CONTROLS ──
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

    const resetBtn = document.createElement('button');
    resetBtn.className = 'counter-reset-btn';
    if(counters[index] <= 0) resetBtn.classList.add('visible');
    resetBtn.innerHTML = '↺';
    resetBtn.title = 'إعادة تعيين';
    resetBtn.addEventListener('click', (ev) => { ev.stopPropagation(); resetCounter(); });
    controls.appendChild(resetBtn);

    // Previously gated behind a HEAD request per card, which cost a network
    // round-trip on every render and hid the button entirely when offline.
    // A missing file is already handled by the <audio> error handler.
    if(resolveVoiceSrc(data.voice)){
      const pb = createPlayButton(data.voice);
      controls.appendChild(pb.wrap);
      controls.appendChild(pb.speedBtn);
      controls.appendChild(pb.speedDrawer);
    }

    updateCountUI(controls, index);
  } else {
    if(resolveVoiceSrc(data.voice)){
      controls.classList.add('center-only');
      const pb = createPlayButton(data.voice);
      controls.appendChild(pb.wrap);
      controls.appendChild(pb.speedBtn);
      controls.appendChild(pb.speedDrawer);
    }
  }

  wrapper.appendChild(card);
  wrapper.appendChild(controls);

  // Touch press animation (fluid)
  let pressTimer = null;
  wrapper.addEventListener('touchstart', () => {
    pressTimer = setTimeout(() => wrapper.classList.add('pressing'), 50);
  }, {passive: true});
  wrapper.addEventListener('touchend', () => {
    clearTimeout(pressTimer);
    wrapper.classList.remove('pressing');
    wrapper.classList.add('releasing');
    setTimeout(() => wrapper.classList.remove('releasing'), 400);
  }, {passive: true});
  wrapper.addEventListener('touchcancel', () => {
    clearTimeout(pressTimer);
    wrapper.classList.remove('pressing');
  }, {passive: true});

  // Tap to increment or advance
  wrapper.addEventListener('click', () => {
    if(movedDuringTouch) return;
    triggerHaptic('light');
    if(hasCounter){
      decrementCounter();
    } else {
      if(currentIndex < cardsData.length - 1){
        goToIndex(currentIndex + 1);
      } else {
        showCompletion();
      }
    }
  });

  return wrapper;
}

/* =========================================
   UPDATE COUNT UI
   ========================================= */
function updateCountUI(container, index) {
  if (!container) return;
  const countValue = container.querySelector('.count-value');
  const countFill = container.querySelector('.count-progress-fill');
  const resetBtn = container.querySelector('.counter-reset-btn');
  if (!countValue || !countFill) return;

  const current = counters[index] || 0;
  const max = cardsData[index].num || 1;
  const ratio = max > 0 ? Math.min(1, current / max) : 0;

  countValue.textContent = toArabicDigits(current); // Update the counter display
  countFill.style.transform = `scaleX(${1 - ratio})`; // Reverse the progress bar

  if (current <= 0) {
    countFill.classList.add('completed');
  } else {
    countFill.classList.remove('completed');
  }

  if (resetBtn) {
    if (current <= 0) resetBtn.classList.add('visible');
    else resetBtn.classList.remove('visible');
  }
}

/* =========================================
   RENDER
   ========================================= */
function render(){
  cancelAnimation();
  stopAndResetAudio();
  
  cardOuter.innerHTML = '';
  isFlipped = false;
  const el = createCardElement(currentIndex);
  cardOuter.appendChild(el);
  el.id = 'activeCard';
  updateHintArrows();
  updatePageResetBtnVisibility();
}

/* =========================================
   COUNTER LOGIC
   ========================================= */
function decrementCounter() {
  if (counters[currentIndex] <= 0) {
    if (currentIndex < cardsData.length - 1) {
      goToIndex(currentIndex + 1);
    } else {
      showCompletion();
    }
    return;
  }

  counters[currentIndex]--; // Decrease the counter

  const wrap = document.getElementById('activeCard');
  if (wrap) {
    const controls = wrap.querySelector('.card-bottom');
    updateCountUI(controls, currentIndex);
  }
  saveState();
  updatePageResetBtnVisibility();

  if (counters[currentIndex] <= 0) {
    triggerHaptic('strong');
    const doneWrap = document.getElementById('activeCard');
    if (doneWrap) {
      const countFill = doneWrap.querySelector('.count-progress-fill');
      if (countFill) countFill.classList.add('completed');
      const resetBtn = doneWrap.querySelector('.counter-reset-btn');
      if (resetBtn) resetBtn.classList.add('visible');
      doneWrap.classList.add('completion-deep');
      setTimeout(() => doneWrap.classList.remove('completion-deep'), 550);
    }

    // Held in `advanceTimer` so leaving the card (navigating, resetting, or
    // going back to the menu) can cancel it. As a bare setTimeout it still
    // fired after the user had moved on — skipping a card, or dropping the
    // completion overlay on top of the main menu.
    clearTimeout(advanceTimer);
    advanceTimer = setTimeout(() => {
      advanceTimer = null;
      if (currentIndex < cardsData.length - 1) {
        goToIndex(currentIndex + 1);
      } else {
        showCompletion();
      }
    }, 500);
  }
}

function resetCounter(){
  const max = cardsData[currentIndex]?.num || 1;
  counters[currentIndex] = max;
  const wrap = document.getElementById('activeCard');
  if(wrap){
    const controls = wrap.querySelector('.card-bottom');
    updateCountUI(controls, currentIndex);
  }
  saveState();
  updatePageResetBtnVisibility();
}

function resetCurrentCollection(){
  counters = cardsData.map(card => card.num || 1);
  const shouldAnimate = currentIndex > 0;
  currentIndex = 0;
  saveState();

  if(shouldAnimate){
    animateToIndex(0, 'down');
  } else {
    render();
  }
}

function updatePageResetBtnVisibility() {
  const globalResetBtn = document.getElementById('globalResetBtn');
  if (!globalResetBtn || !cardsData || !counters) return;

  const isUsed = currentIndex > 0 || counters.some((c, idx) => {
    const max = cardsData[idx]?.num || 1;
    return c < max;
  });

  if (isUsed) {
    globalResetBtn.classList.add('visible');
  } else {
    globalResetBtn.classList.remove('visible');
  }
}

function showCompletion(){
  // `currentFileIndex` was never declared anywhere — a leftover from the
  // pre-pool file-index model. This threw a ReferenceError on the first line,
  // so finishing a collection silently did nothing at all.
  resetCollectionProgress(currentCategoryId);

  // Clearing localStorage alone left `counters` at zero in memory, and the
  // next saveState() wrote the completed state straight back. Reset both.
  counters = cardsData.map(card => card.num || 1);
  currentIndex = 0;

  const overlay = document.createElement('div');
  overlay.className = 'completion-overlay';
  overlay.innerHTML = '<div class="completion-card"><h2>تقبّل الله ✨</h2><p>أتممت '
    + titleEl.textContent + ' بنجاح</p></div>';
  overlay.addEventListener('click', function(){
    overlay.remove();
    render();
    updatePageResetBtnVisibility();
  });
  document.body.appendChild(overlay);
}


/* =========================================
   CANCEL ANIMATION
   ========================================= */
function cancelAnimation(){
  if(animationTimer){
    clearTimeout(animationTimer);
    animationTimer = null;
  }
  if(advanceTimer){
    clearTimeout(advanceTimer);
    advanceTimer = null;
  }
  const wraps = cardOuter.querySelectorAll('.card-wrap');
  wraps.forEach(w => {
    if(w.id !== 'activeCard') w.remove();
  });
}

/* =========================================
   NAVIGATION
   ========================================= */
function goToIndex(idx){
  if(idx < 0 || idx >= cardsData.length || idx === currentIndex) return;
  const dir = idx > currentIndex ? 'up' : 'down';
  
  // Stop audio when scrolling away from active card
  stopAndResetAudio();
  
  animateToIndex(idx, dir);
}

function animateToIndex(newIndex, direction){
  cancelAnimation();

  currentIndex = newIndex;
  isFlipped = false;

  const currentWrap = document.getElementById('activeCard');
  const newWrap = createCardElement(newIndex);

  // Parallax update
  updateParallax();

  newWrap.style.transform = `translateY(${direction === 'up' ? '100%' : '-100%'})`;
  newWrap.style.opacity = '0';
  cardOuter.appendChild(newWrap);

  void newWrap.offsetHeight;

  requestAnimationFrame(() => {
    if(currentWrap){
      currentWrap.id = '';
      currentWrap.style.transform = `translateY(${direction === 'up' ? '-100%' : '100%'})`;
      currentWrap.style.opacity = '0';
    }
    newWrap.style.transform = 'translateY(0)';
    newWrap.style.opacity = '1';
    newWrap.id = 'activeCard';
  });

  updateHintArrows();
  saveState();
  updatePageResetBtnVisibility();

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
   HINT ARROWS
   ========================================= */
function updateHintArrows(){
  hintUp.classList.add('hidden');
  hintDown.classList.add('hidden');
  const hasFadhel = !!cardsData[currentIndex]?.fadhel;
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < cardsData.length - 1;
  hintLeft.classList.toggle('hidden', !(hasFadhel || canPrev));
  hintRight.classList.toggle('hidden', !(hasFadhel || canNext));
}

/* =========================================
   SWIPE / TOUCH / MOUSE
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

  if(Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > H_THRESH){
    toggleFlip();
    return;
  }

  if(Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > V_THRESH){
    const scrollEl = getScrollContainer();
    const hasOverflow = scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight + 4;

    if(dy < 0){
      if(!hasOverflow || isScrolledToBottom(scrollEl)){
        goToIndex(currentIndex + 1);
      }
    } else {
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
  const scrollEl = getScrollContainer();
  const hasOverflow = scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight + 4;
  if(!hasOverflow) e.preventDefault();
}, {passive: false});

cardOuter.addEventListener('touchend', e => {
  const t = e.changedTouches[0];
  onEnd(t.clientX, t.clientY);
});

let mouseDown = false;
cardOuter.addEventListener('mousedown', e => { mouseDown = true; onStart(e.clientX, e.clientY); });
window.addEventListener('mousemove', e => { if(mouseDown) onMove(e.clientX, e.clientY); });
window.addEventListener('mouseup', e => { if(mouseDown){ mouseDown = false; onEnd(e.clientX, e.clientY); }});

window.addEventListener('keydown', e => {
  if(e.key === 'ArrowUp')   goToIndex(currentIndex - 1);
  if(e.key === 'ArrowDown') goToIndex(currentIndex + 1);
  if(e.key === 'ArrowLeft' || e.key === 'ArrowRight') toggleFlip();
  if(e.key === ' ') { e.preventDefault(); decrementCounter(); }
});

// Stop audio when page visibility changes (minimize)
document.addEventListener('visibilitychange', () => {
  if(document.hidden) stopAndResetAudio();
});

/* =========================================
   OPTIONS MENU
   ========================================= */
const optionsMenu = document.getElementById('optionsMenu');
const resetAllMenuBtn = document.getElementById('resetAllMenuBtn');
const contactDevBtn = document.getElementById('contactDevBtn');
const contactPopup = document.getElementById('contactPopup');
const contactClose = document.getElementById('contactClose');


function openOptionsMenu(){
  optionsMenu.classList.add('open');
  closeDropdown();
  closePrayerMenu();
}
function closeOptionsMenu(){
  optionsMenu.classList.remove('open');
}

document.addEventListener('click', (e) => {
  if(!e.target.closest('.options-menu') && !e.target.closest('.dropdown-option-secondary')){
    closeOptionsMenu();
  }
});

if(contactDevBtn){
  contactDevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeOptionsMenu();
    if(contactPopup) contactPopup.classList.add('open');
  });
}
if(contactClose){
  contactClose.addEventListener('click', () => {
    if(contactPopup) contactPopup.classList.remove('open');
  });
}
if(contactPopup){
  contactPopup.addEventListener('click', (e) => {
    if(e.target === contactPopup) contactPopup.classList.remove('open');
  });
}

if(resetAllMenuBtn){
  resetAllMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeOptionsMenu();
    resetAllState();
  });
}

const globalResetBtn = document.getElementById('globalResetBtn');
if(globalResetBtn){
  globalResetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetCurrentCollection();
  });
}

/* =========================================
   PRAYER TIMES PAGE
   ========================================= */
const prayerPage = document.getElementById('prayerPage');
const menuPage = document.getElementById('menuPage');
const mainPage = document.getElementById('mainPage');
const menuBackBtn = document.getElementById('menuBackBtn');
const prayerBackBtn = document.getElementById('prayerBackBtn');
const citySelect = document.getElementById('citySelect');
const prayerList = document.getElementById('prayerList');
const prayerDate = document.getElementById('prayerDate');
const nextPrayerCard = document.getElementById('nextPrayerCard');
const nextPrayerName = document.getElementById('nextPrayerName');
const nextPrayerCountdown = document.getElementById('nextPrayerCountdown');
const prayerLoading = document.getElementById('prayerLoading');

function showMenuPage(){
  // Cancel any in-flight card advance so it can't fire once we're on the menu
  // (it used to drop the completion overlay on top of the main menu).
  cancelAnimation();
  stopAndResetAudio();
  if(prayerPage) prayerPage.style.display = 'none';
  if(mainPage) mainPage.style.display = 'none';
  if(menuPage){
    menuPage.style.display = 'flex';
    menuPage.style.animation = 'fadeIn 300ms ease';
  }
  document.body.classList.add('menu-active');
  if(window.MainMenu?.renderMainMenu) window.MainMenu.renderMainMenu();
}

function showAthkarPage(){
  if(menuPage) menuPage.style.display = 'none';
  if(prayerPage) prayerPage.style.display = 'none';
  if(mainPage){
    mainPage.style.display = 'flex';
    mainPage.style.animation = 'fadeIn 300ms ease';
  }
  document.body.classList.remove('menu-active');
  if(window.MainMenu?.stopMenuCountdown) window.MainMenu.stopMenuCountdown();
}

function openAthkarCategory(categoryId, { resume = false, reset = false } = {}){
  if(reset) resetCollectionProgress(categoryId);
  showAthkarPage();
  switchCollection(categoryId);
}

// NOTE: nothing currently calls this — the prayer page in index.html is fully
// built (and its back button works) but has no entry point, so prayer times are
// only reachable via the top dropdown. Kept rather than deleted because the
// screen is wanted; wiring up a trigger is a product decision, not a bug fix.
// eslint-disable-next-line no-unused-vars
function showPrayerPage(){
  closeOptionsMenu();
  stopAndResetAudio();
  if(menuPage) menuPage.style.display = 'none';
  if(mainPage) mainPage.style.display = 'none';
  document.body.classList.remove('menu-active');
  if(window.MainMenu?.stopMenuCountdown) window.MainMenu.stopMenuCountdown();
  prayerPage.style.display = 'flex';
  prayerPage.style.animation = 'fadeIn 300ms ease';
  loadPrayerTimes();
}

function hidePrayerPage(){
  prayerPage.style.display = 'none';
  showMenuPage();
  if(prayerCountdownInterval){
    clearInterval(prayerCountdownInterval);
    prayerCountdownInterval = null;
  }
}

if(prayerBackBtn){
  prayerBackBtn.addEventListener('click', hidePrayerPage);
}

if(menuBackBtn){
  menuBackBtn.addEventListener('click', () => {
    stopAndResetAudio();
    showMenuPage();
  });
}

// Restore saved city
const savedCity = localStorage.getItem(LS_CITY);
if(savedCity && citySelect){
  citySelect.value = savedCity;
}

if(citySelect){
  citySelect.addEventListener('change', () => {
    localStorage.setItem(LS_CITY, citySelect.value);
    syncCityButtons();
    prayerCityExpanded = false;
    loadPrayerTimes();
  });
}

async function loadPrayerTimes(){
  const cityVal = citySelect ? citySelect.value : 'Makkah,SA';
  
  if (cityVal === 'auto') {
    if (prayerLoading) prayerLoading.style.display = 'flex';
    prayerList.innerHTML = '';
    prayerList.appendChild(prayerLoading);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const gpsVal = `gps:${lat},${lng}`;
          
          if (citySelect) {
            let opt = Array.from(citySelect.options).find(o => o.value.startsWith('gps:'));
            if (!opt) {
              opt = document.createElement('option');
              opt.textContent = 'موقعي الحالي';
              citySelect.appendChild(opt);
            }
            opt.value = gpsVal;
            citySelect.value = gpsVal;
            localStorage.setItem(LS_CITY, gpsVal);
          }
          loadPrayerTimes();
        },
        (error) => {
          console.warn('Geolocation error:', error);
          alert('تعذّر تحديد الموقع. سيتم الرجوع إلى الرياض.');
          if (citySelect) {
            citySelect.value = 'Riyadh,SA';
            localStorage.setItem(LS_CITY, 'Riyadh,SA');
          }
          loadPrayerTimes();
        }
      );
    } else {
      alert('متصفحك لا يدعم تحديد الموقع. سيتم الرجوع إلى الرياض.');
      if (citySelect) {
        citySelect.value = 'Riyadh,SA';
        localStorage.setItem(LS_CITY, 'Riyadh,SA');
      }
      loadPrayerTimes();
    }
    return;
  }

  try {
    if(prayerLoading) prayerLoading.style.display = 'flex';
    if(prayerList) {
      prayerList.innerHTML = '';
      if(prayerLoading) prayerList.appendChild(prayerLoading);
    }
    if(nextPrayerCard) nextPrayerCard.style.display = 'none';
    
    const data = await fetchPrayerTimes(cityVal);
    
    if(!data){
      if(prayerList) prayerList.innerHTML = '<div style="text-align:center;padding:40px;color:#999">تعذّر تحميل المواقيت</div>';
      return;
    }

    syncCityButtons();
    
    // Show date
    if(prayerDate && data.date){
      const hijri = data.date.hijri;
      const greg = data.date.gregorian;
      prayerDate.textContent = `${hijri.day} ${hijri.month.ar} ${hijri.year} — ${greg.day} ${greg.month.en} ${greg.year}`;
    }
    
    // Build prayer cards
    if(prayerList) {
      prayerList.innerHTML = '';
      const now = new Date();
      const nextP = getNextPrayer(data.timings);
      
      PRAYER_KEYS.forEach(key => {
        const timeStr = data.timings[key];
        if(!timeStr) return;
        const prayerTime = parsePrayerTime(timeStr);
        const isPassed = now > prayerTime;
        const isNext = nextP && nextP.key === key;
        
        const card = document.createElement('div');
        card.className = 'prayer-card';
        if(isPassed && !isNext) card.classList.add('passed');
        if(isNext) card.classList.add('active');
        
        const nameEl = document.createElement('div');
        nameEl.className = 'prayer-card-name';
        nameEl.textContent = PRAYER_NAMES[key];
        
        const timeEl = document.createElement('div');
        timeEl.className = 'prayer-card-time';
        timeEl.textContent = timeStr.replace(/\s*\(.*\)/, '');
        
        card.appendChild(nameEl);
        card.appendChild(timeEl);
        prayerList.appendChild(card);
      });
      
      // Next prayer countdown
      if(nextP){
        if(nextPrayerCard) nextPrayerCard.style.display = 'block';
        if(nextPrayerName) nextPrayerName.textContent = nextP.name;
        updatePrayerSummary(nextP);
        buildPrayerMenu(data.timings);
        
        const updateCountdown = () => {
          updateCountdownDisplay(nextP);
          const now = new Date();
          let diff = nextP.time - now;
          if(diff < 0) diff = 0;
          if(diff <= 0){
            clearInterval(prayerCountdownInterval);
            if(nextPrayerCountdown) nextPrayerCountdown.textContent = 'حان الآن';
          }
        };
        updateCountdown();
        if(prayerCountdownInterval) clearInterval(prayerCountdownInterval);
        prayerCountdownInterval = setInterval(updateCountdown, 1000);
      }
      else{
        buildPrayerMenu(data.timings);
      }
    }
  } catch (e) {
    console.error("Error loading prayer times:", e);
  }

  try {
    updateBackgroundForTime();
  } catch (e) {}

  try {
    if(window.MainMenu?.renderMainMenu){
      window.MainMenu.renderMainMenu();
    }
  } catch (e) {}
}



/* =========================================
   RESET ALL STORAGE
   ========================================= */
function resetAllState(){
  if(window.MainMenu?.MENU_CATEGORIES) {
    window.MainMenu.MENU_CATEGORIES.forEach(cat => {
      resetCollectionProgress(cat.id);
    });
  }

  counters = cardsData.map(card => card.num || 1);
  const shouldAnimate = currentIndex > 0;
  currentIndex = 0;
  saveState();

  if(shouldAnimate){
    animateToIndex(0, 'down');
  } else {
    render();
  }
}

/* =========================================
   INIT
   ========================================= */
(async function init(){
  await loadSheikhConfigs();

  buildDropdown();

  const savedCityVal = localStorage.getItem(LS_CITY) || 'Riyadh,SA';
  if(citySelect) {
    if (savedCityVal.startsWith('gps:') && !Array.from(citySelect.options).some(o => o.value === savedCityVal)) {
      const opt = document.createElement('option');
      opt.textContent = 'موقعي الحالي';
      opt.value = savedCityVal;
      citySelect.appendChild(opt);
    }
    citySelect.value = savedCityVal;
  }
  syncCityButtons();

  window.AthkarApp = {
    getPrayerTimes: () => cachedPrayerTimes,
    getSelectedCityLabel,
    sheikhConfigs: sheikhConfigs,
    hasCollectionProgressByCategory: (categoryId) => {
      return hasCollectionProgress(categoryId);
    },
    isCategoryAvailable: (category) => {
      return !!category.file || !!sheikhConfigs[category.id];
    },
    openAthkarCategory,
    showMenuPage,
    showAthkarPage,
  };

  showMenuPage();

  // Fire and forget — don't block app load
  fetchPrayerTimes(savedCityVal).then(() => {
    const nextP = getNextPrayer(cachedPrayerTimes);
    if(cachedPrayerTimes){
      buildPrayerMenu(cachedPrayerTimes);
      updatePrayerSummary(nextP);
      updateCountdownDisplay(nextP);
    }
    updateBackgroundForTime();
    if(document.body.classList.contains('menu-active') && window.MainMenu?.renderMainMenu){
      window.MainMenu.renderMainMenu();
    }
  });
  
  // Apply a default background immediately
  const hour = new Date().getHours();
  let defaultPeriod = 'dhuhr';
  if(hour >= 0 && hour < 5) defaultPeriod = 'isha';
  else if(hour >= 5 && hour < 7) defaultPeriod = 'fajr';
  else if(hour >= 7 && hour < 12) defaultPeriod = 'dhuhr';
  else if(hour >= 12 && hour < 15) defaultPeriod = 'dhuhr';
  else if(hour >= 15 && hour < 17) defaultPeriod = 'asr';
  else if(hour >= 17 && hour < 19) defaultPeriod = 'maghrib';
  else defaultPeriod = 'isha';
  applyDynamicBackground(defaultPeriod);
})();
