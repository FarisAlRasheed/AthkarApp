/** @typedef {{ id: string, title: string, file: string | null }} MenuCategory */

/** Placeholder categories — hook file index via AthkarApp.resolveCategoryFileIndex */
const MENU_CATEGORIES = /** @type {MenuCategory[]} */ ([
  { id: 'morning', title: 'اذكار الصباح', file: 'morning.json' },
  { id: 'evening', title: 'اذكار المساء', file: 'evening.json' },
  { id: 'tasbih', title: 'المسبحة', file: null },
  { id: 'post-prayer', title: 'اذكار بعد الصلاة', file: 'post-prayer.json' },
  { id: 'sleep', title: 'اذكار النوم', file: 'sleep.json' },
]);

/** Placeholder prayer times for offline / pre-fetch rendering */
const PLACEHOLDER_PRAYER_TIMES = {
  Fajr: '04:33',
  Sunrise: '05:15',
  Dhuhr: '11:56',
  Asr: '15:20',
  Maghrib: '18:05',
  Isha: '19:35',
};

/** Placeholder progress map — replace with localStorage/API via AthkarApp.hasCollectionProgress */
const PLACEHOLDER_PROGRESS = Object.fromEntries(
  MENU_CATEGORIES.map((c) => [c.id, false])
);

const SUGGESTED_WINDOW_MS = 35 * 60 * 1000;
const PRAYER_ROW_KEYS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_ROW_LABELS = {
  Fajr: 'الفجر',
  Sunrise: 'الشروق',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

let menuCountdownInterval = null;
let menuCityOpen = false;

function findCategory(categoryId) {
  return MENU_CATEGORIES.find((c) => c.id === categoryId) || MENU_CATEGORIES[0];
}

function parseMenuPrayerTime(timeStr, baseDate = new Date()) {
  const clean = String(timeStr).replace(/\s*\(.*\)/, '').trim();
  const [h, m] = clean.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
}

function formatArabicPrayerTime(timeStr) {
  if (!timeStr) return toArabicDigits('--:--');
  const clean = String(timeStr).replace(/\s*\(.*\)/, '').trim();
  const [hours, minutes] = clean.split(':').map(Number);
  const period = hours >= 12 ? 'م' : 'ص';
  const h12 = hours % 12 || 12;
  return toArabicDigits(`${h12}:${String(minutes).padStart(2, '0')}`) + ' ' + period;
}

function formatMenuCountdown(diffMs) {
  if (diffMs <= 0) return toArabicDigits('00:00:00');
  const totalSec = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const hStr = String(h).padStart(2, '0');
  const mStr = String(m).padStart(2, '0');
  const sStr = String(s).padStart(2, '0');
  return toArabicDigits(`${hStr}:${mStr}:${sStr}`);
}

/**
 * Suggested thikr based on 35-minute post-prayer windows.
 * @param {Date} currentTime
 * @param {Record<string, string> | null} prayerTimes
 * @returns {MenuCategory}
 */
function getSuggestedThikr(currentTime, prayerTimes) {
  const timings = prayerTimes || PLACEHOLDER_PRAYER_TIMES;

  const priorityRules = [
    { key: 'Fajr', categoryId: 'morning' },
    { key: 'Asr', categoryId: 'evening' },
    { key: 'Isha', categoryId: 'sleep' },
  ];

  for (const rule of priorityRules) {
    if (!timings[rule.key]) continue;
    const start = parseMenuPrayerTime(timings[rule.key], currentTime);
    const end = new Date(start.getTime() + SUGGESTED_WINDOW_MS);
    if (currentTime >= start && currentTime < end) {
      return findCategory(rule.categoryId);
    }
  }

  for (const key of ['Dhuhr', 'Maghrib']) {
    if (!timings[key]) continue;
    const start = parseMenuPrayerTime(timings[key], currentTime);
    const end = new Date(start.getTime() + SUGGESTED_WINDOW_MS);
    if (currentTime >= start && currentTime < end) {
      return findCategory('post-prayer');
    }
  }

  return getFallbackSuggestedThikr(currentTime, timings);
}

function getFallbackSuggestedThikr(currentTime, prayerTimes) {
  const fajr = parseMenuPrayerTime(prayerTimes.Fajr, currentTime);
  const sunrise = parseMenuPrayerTime(prayerTimes.Sunrise, currentTime);
  const asr = parseMenuPrayerTime(prayerTimes.Asr, currentTime);
  const isha = parseMenuPrayerTime(prayerTimes.Isha, currentTime);
  const ishaEnd = new Date(isha.getTime() + SUGGESTED_WINDOW_MS);

  if (currentTime >= ishaEnd || currentTime < fajr) {
    return findCategory('sleep');
  }
  if (currentTime >= fajr && currentTime < sunrise) {
    return findCategory('morning');
  }
  if (currentTime < asr) {
    return findCategory('morning');
  }

  const asrEnd = new Date(asr.getTime() + SUGGESTED_WINDOW_MS);
  if (currentTime >= asrEnd && currentTime < isha) {
    return findCategory('evening');
  }

  const hour = currentTime.getHours();
  if (hour >= 3 && hour < 15) return findCategory('morning');
  return findCategory('evening');
}

function getNextMenuPrayer(prayerTimes) {
  const timings = prayerTimes || PLACEHOLDER_PRAYER_TIMES;
  const now = new Date();
  for (const key of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) {
    const time = parseMenuPrayerTime(timings[key], now);
    if (now < time) {
      return { key, name: PRAYER_ROW_LABELS[key], time };
    }
  }
  const tomorrowFajr = parseMenuPrayerTime(timings.Fajr, now);
  tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
  return { key: 'Fajr', name: PRAYER_ROW_LABELS.Fajr, time: tomorrowFajr };
}

function getUpcomingPrayerRow(prayerTimes, maxItems = 3) {
  const timings = prayerTimes || PLACEHOLDER_PRAYER_TIMES;
  const now = new Date();

  let startIdx = 0;
  for (let i = 0; i < PRAYER_ROW_KEYS.length; i++) {
    const key = PRAYER_ROW_KEYS[i];
    const time = parseMenuPrayerTime(timings[key], now);
    if (time > now) {
      startIdx = i;
      break;
    }
    if (i < PRAYER_ROW_KEYS.length - 1) {
      const nextKey = PRAYER_ROW_KEYS[i + 1];
      const nextTime = parseMenuPrayerTime(timings[nextKey], now);
      if (now >= time && now < nextTime) {
        startIdx = i;
        break;
      }
    }
    startIdx = i;
  }

  const items = [];
  for (let i = startIdx; i < PRAYER_ROW_KEYS.length && items.length < maxItems; i++) {
    const key = PRAYER_ROW_KEYS[i];
    if (!timings[key]) continue;
    items.push({ key, label: PRAYER_ROW_LABELS[key], timeStr: timings[key] });
  }
  return items;
}

function hasCategoryProgress(categoryId) {
  if (window.AthkarApp?.hasCollectionProgressByCategory) {
    return window.AthkarApp.hasCollectionProgressByCategory(categoryId);
  }
  return !!PLACEHOLDER_PROGRESS[categoryId];
}

function isCategoryAvailable(category) {
  if (!category.file) return false;
  if (window.AthkarApp?.isCategoryAvailable) {
    return window.AthkarApp.isCategoryAvailable(category);
  }
  return true;
}

function handleResumeClick(e, category) {
  e.stopPropagation();
  if (!isCategoryAvailable(category)) return;
  if (window.AthkarApp?.openAthkarCategory) {
    window.AthkarApp.openAthkarCategory(category.id, { resume: true });
  }
}

function handleCardClick(category) {
  if (!isCategoryAvailable(category)) {
    window.alert('هذا القسم قريباً');
    return;
  }

  const hasProgress = hasCategoryProgress(category.id);
  if (hasProgress) {
    const confirmed = window.confirm(
      'تحذير: ستبدأ من جديد وستفقد تقدمك الحالي. هل تود الاستمرار؟'
    );
    if (!confirmed) return;
    if (window.AthkarApp?.openAthkarCategory) {
      window.AthkarApp.openAthkarCategory(category.id, { resume: false, reset: true });
    }
    return;
  }

  if (window.AthkarApp?.openAthkarCategory) {
    window.AthkarApp.openAthkarCategory(category.id, { resume: false, reset: false });
  }
}

function createThikrCard(category, { large = false } = {}) {
  const available = isCategoryAvailable(category);
  const hasProgress = available && hasCategoryProgress(category.id);

  const card = document.createElement('div');
  card.dataset.categoryId = category.id;
  card.className = [
    'relative w-full text-center font-bold transition-all thikr-card',
    large ? 'rounded-[24px] min-h-[140px] text-2xl px-6 py-8' : 'rounded-[16px] min-h-[100px] text-lg px-4 py-6',
    available ? 'active:scale-[0.98] cursor-pointer' : 'opacity-40 cursor-not-allowed',
    'flex items-center justify-center',
  ].join(' ');
  card.setAttribute('role', 'button');
  card.tabIndex = available ? 0 : -1;

  const title = document.createElement('span');
  title.textContent = category.title;
  card.appendChild(title);

  if (hasProgress) {
    const resumeBtn = document.createElement('button');
    resumeBtn.type = 'button';
    resumeBtn.textContent = 'اكمل';
    resumeBtn.className =
      'absolute bottom-3 left-3 z-10 rounded-full px-3 py-1 text-sm font-bold shadow-sm resume-btn';
    resumeBtn.addEventListener('click', (e) => handleResumeClick(e, category));
    card.appendChild(resumeBtn);
  }

  if (available) {
    card.addEventListener('click', () => handleCardClick(category));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCardClick(category);
      }
    });
  }

  return card;
}

function renderCitySelector(root, cityLabel) {
  const wrap = document.createElement('div');
  wrap.className = 'relative';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'menuCityBtn';
  btn.className = 'flex items-center gap-1 text-base font-bold';
  btn.innerHTML = `
    <span id="menuCityLabel">${cityLabel}</span>
    <svg class="transition-transform ${menuCityOpen ? 'rotate-180' : ''}" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  const dropdown = document.createElement('div');
  dropdown.id = 'menuCityDropdown';
  dropdown.className = [
    'absolute top-full left-0 z-50 mt-2 max-h-56 min-w-[180px] overflow-y-auto rounded-xl shadow-lg',
    menuCityOpen ? '' : 'hidden',
  ].join(' ');

  const citySelect = document.getElementById('citySelect');
  if (citySelect) {
    Array.from(citySelect.options).forEach((option) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = [
        'block w-full px-4 py-2 text-right text-sm font-semibold hover:bg-cyan-500/10',
        option.selected ? 'text-cyan-500 font-bold' : 'opacity-80',
      ].join(' ');
      item.textContent = option.textContent;
      item.addEventListener('click', () => {
        citySelect.value = option.value;
        citySelect.dispatchEvent(new Event('change', { bubbles: true }));
        menuCityOpen = false;
        renderMainMenu();
      });
      dropdown.appendChild(item);
    });
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuCityOpen = !menuCityOpen;
    renderMainMenu();
  });

  wrap.appendChild(btn);
  wrap.appendChild(dropdown);
  root.appendChild(wrap);
}

function isDaytime(currentTime, prayerTimes) {
  const timings = prayerTimes || PLACEHOLDER_PRAYER_TIMES;
  if (!timings.Fajr || !timings.Maghrib) return true;
  const fajr = parseMenuPrayerTime(timings.Fajr, currentTime);
  const maghrib = parseMenuPrayerTime(timings.Maghrib, currentTime);
  return currentTime >= fajr && currentTime < maghrib;
}

function renderMainMenu() {
  const root = document.getElementById('mainMenuRoot');
  if (!root) return;

  const prayerTimes = window.AthkarApp?.getPrayerTimes?.() || PLACEHOLDER_PRAYER_TIMES;
  const now = new Date();
  const suggested = getSuggestedThikr(now, prayerTimes);
  const nextPrayer = getNextMenuPrayer(prayerTimes);
  const diff = Math.max(0, nextPrayer.time - now);
  const cityLabel = window.AthkarApp?.getSelectedCityLabel?.() || 'الرياض';

  const isDay = isDaytime(now, prayerTimes);
  if (isDay) {
    root.classList.remove('theme-nighttime');
    root.classList.add('theme-daytime');
    document.body.classList.remove('theme-nighttime-body');
  } else {
    root.classList.remove('theme-daytime');
    root.classList.add('theme-nighttime');
    document.body.classList.add('theme-nighttime-body');
  }

  root.innerHTML = '';

  // ── Section 1: Header + Countdown + Prayer Row ──
  const section1 = document.createElement('section');
  section1.className = 'mb-6';

  const header = document.createElement('div');
  header.className = 'mb-8 flex items-center justify-between';

  const logo = document.createElement('img');
  logo.src = 'images/logo.png';
  logo.alt = 'أذكارنا';
  logo.className = 'h-14 w-auto object-contain';
  header.appendChild(logo);

  renderCitySelector(header, cityLabel);
  section1.appendChild(header);

  const countdownBlock = document.createElement('div');
  countdownBlock.className = 'mb-6 text-center';
  countdownBlock.innerHTML = `
    <p class="mb-2 text-base font-semibold opacity-85">بقي على ${nextPrayer.name}</p>
    <p id="menuCountdown" class="text-5xl font-black tracking-tight" dir="ltr">${formatMenuCountdown(diff)}</p>
  `;
  section1.appendChild(countdownBlock);

  const prayerRow = document.createElement('div');
  prayerRow.className = 'flex flex-wrap items-start justify-center gap-x-4 gap-y-2 text-sm font-bold opacity-90';
  PRAYER_ROW_KEYS.forEach((key) => {
    const timeStr = prayerTimes[key];
    if (!timeStr) return;
    const cell = document.createElement('div');
    cell.className = 'text-center';
    cell.innerHTML = `
      <div>${PRAYER_ROW_LABELS[key]}</div>
      <div dir="ltr">${formatArabicPrayerTime(timeStr)}</div>
    `;
    prayerRow.appendChild(cell);
  });
  section1.appendChild(prayerRow);
  root.appendChild(section1);

  // ── Section 2: Suggested Thikr Card ──
  const section2 = document.createElement('section');
  section2.className = 'mb-4';
  section2.appendChild(createThikrCard(suggested, { large: true }));
  root.appendChild(section2);

  // ── Section 3: Categories Grid ──
  const gridCategories = MENU_CATEGORIES.filter((c) => c.id !== suggested.id);
  const section3 = document.createElement('section');
  section3.className = 'grid grid-cols-2 gap-3';
  gridCategories.forEach((category) => {
    section3.appendChild(createThikrCard(category));
  });
  root.appendChild(section3);

  if (menuCountdownInterval) clearInterval(menuCountdownInterval);
  menuCountdownInterval = setInterval(() => {
    const countdownEl = document.getElementById('menuCountdown');
    if (!countdownEl) return;
    const currentNext = getNextMenuPrayer(window.AthkarApp?.getPrayerTimes?.() || PLACEHOLDER_PRAYER_TIMES);
    const remaining = Math.max(0, currentNext.time - new Date());
    countdownEl.textContent = formatMenuCountdown(remaining);
  }, 1000);
}

function stopMenuCountdown() {
  if (menuCountdownInterval) {
    clearInterval(menuCountdownInterval);
    menuCountdownInterval = null;
  }
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('#menuCityBtn') && !e.target.closest('#menuCityDropdown')) {
    if (menuCityOpen) {
      menuCityOpen = false;
      const dropdown = document.getElementById('menuCityDropdown');
      if (dropdown) dropdown.classList.add('hidden');
    }
  }
});

window.MainMenu = {
  MENU_CATEGORIES,
  PLACEHOLDER_PRAYER_TIMES,
  PLACEHOLDER_PROGRESS,
  getSuggestedThikr,
  renderMainMenu,
  stopMenuCountdown,
};
