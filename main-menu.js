/** @typedef {{ id: string, title: string, file: string | null }} MenuCategory */

/** Placeholder categories — hook file index via AthkarApp.resolveCategoryFileIndex */
const MENU_CATEGORIES = /** @type {MenuCategory[]} */ ([
  { id: 'morning', title: 'أذكار الصباح', file: 'morning.json' },
  { id: 'evening', title: 'أذكار المساء', file: 'evening.json' },
  { id: 'tasbih', title: 'المسبحة', file: null },
  { id: 'post-prayer', title: 'أذكار بعد الصلاة', file: 'post-prayer.json' },
  { id: 'sleep', title: 'أذكار النوم', file: 'sleep.json' },
]);

/** Placeholder prayer times for offline / pre-fetch rendering */
const PLACEHOLDER_PRAYER_TIMES = {
  Fajr: '00:00',
  Sunrise: '00:00',
  Dhuhr: '00:00',
  Asr: '00:00',
  Maghrib: '00:00',
  Isha: '00:00',
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
let menuOptionsOpen = false;

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

function showRestartModal(onStartFromFirst, onContinue) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 opacity-0';
  
  const modal = document.createElement('div');
  modal.className = 'bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-[90%] max-w-sm p-6 transform scale-95 transition-transform duration-300 opacity-0 text-center';
  
  const title = document.createElement('h3');
  title.className = 'text-lg font-bold mb-2 text-gray-900 dark:text-white';
  title.textContent = 'تنبيه';
  
  const desc = document.createElement('p');
  desc.className = 'text-sm mb-6 text-gray-600 dark:text-gray-300';
  desc.textContent = 'هل تريد البدء من جديد أم المتابعة من حيث توقفت؟';

  const btnContainer = document.createElement('div');
  btnContainer.className = 'flex flex-col gap-3';
  
  const continueBtn = document.createElement('button');
  continueBtn.className = 'w-full py-3 rounded-xl font-bold bg-cyan-500 text-white hover:bg-cyan-600 transition-colors shadow-md';
  continueBtn.textContent = 'متابعة'; // Continue
  
  const startBtn = document.createElement('button');
  startBtn.className = 'w-full py-3 rounded-xl font-bold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors';
  startBtn.textContent = 'البدء من جديد'; // Start from first
  
  btnContainer.appendChild(continueBtn);
  btnContainer.appendChild(startBtn);
  
  modal.appendChild(title);
  modal.appendChild(desc);
  modal.appendChild(btnContainer);
  overlay.appendChild(modal);
  
  document.body.appendChild(overlay);
  
  requestAnimationFrame(() => {
    overlay.classList.remove('opacity-0');
    modal.classList.remove('scale-95', 'opacity-0');
  });

  const close = () => {
    overlay.classList.add('opacity-0');
    modal.classList.add('scale-95', 'opacity-0');
    setTimeout(() => overlay.remove(), 300);
  };

  startBtn.addEventListener('click', () => {
    close();
    onStartFromFirst();
  });
  
  continueBtn.addEventListener('click', () => {
    close();
    onContinue();
  });
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      close();
    }
  });
}

function handleRestartClick(e, category) {
  e.stopPropagation();
  if (!isCategoryAvailable(category)) return;
  
  showRestartModal(
    () => {
      if (window.AthkarApp?.openAthkarCategory) {
        window.AthkarApp.openAthkarCategory(category.id, { resume: false, reset: true });
      }
    },
    () => {
      if (window.AthkarApp?.openAthkarCategory) {
        window.AthkarApp.openAthkarCategory(category.id, { resume: true, reset: false });
      }
    }
  );
}

function handleCardClick(category) {
  if (!isCategoryAvailable(category)) {
    window.alert('هذا القسم قريباً');
    return;
  }

  const hasProgress = hasCategoryProgress(category.id);
  if (hasProgress) {
    if (window.AthkarApp?.openAthkarCategory) {
      window.AthkarApp.openAthkarCategory(category.id, { resume: true, reset: false });
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
    const continueHint = document.createElement('div');
    continueHint.className = 'absolute top-3 right-4 text-[11px] font-bold text-cyan-600 dark:text-cyan-400';
    continueHint.textContent = 'اضغط للمتابعة';
    card.appendChild(continueHint);

    const restartBtn = document.createElement('button');
    restartBtn.type = 'button';
    restartBtn.textContent = 'من البداية';
    restartBtn.className =
      'absolute bottom-3 left-3 z-10 rounded-full px-3 py-1 text-xs font-bold shadow-sm resume-btn';
    restartBtn.addEventListener('click', (e) => handleRestartClick(e, category));
    card.appendChild(restartBtn);
  }

  if (available && window.AthkarApp?.sheikhConfigs) {
    const configs = window.AthkarApp.sheikhConfigs[category.id];
    if (configs && Object.keys(configs).length > 1) {
      const keys = Object.keys(configs);
      let selectedKey = localStorage.getItem('athkar_sheikh_' + category.id);
      if (!selectedKey || !configs[selectedKey]) {
        selectedKey = keys[0];
      }

      const sheikhWrap = document.createElement('div');
      sheikhWrap.className = 'absolute bottom-3 right-3 z-20';

      const sheikhBtn = document.createElement('button');
      sheikhBtn.type = 'button';
      sheikhBtn.className = 'flex items-center gap-1 rounded-full bg-black/20 dark:bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-md transition-colors hover:bg-black/30 dark:hover:bg-white/30';
      sheikhBtn.innerHTML = `
        <span>${configs[selectedKey].name}</span>
        <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" class="transition-transform">
          <polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;

      const sheikhDropdown = document.createElement('div');
      sheikhDropdown.className = 'absolute bottom-full right-0 mb-1 hidden min-w-[140px] z-[100] flex-col overflow-hidden rounded-xl bg-white dark:bg-[#1c1c1e] shadow-lg border border-black/5 dark:border-white/5 sheikh-dropdown-popup';

      keys.forEach(key => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'w-full px-4 py-2 text-right text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors ' + (key === selectedKey ? 'text-cyan-500' : '');
        item.textContent = configs[key].name;
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          localStorage.setItem('athkar_sheikh_' + category.id, key);
          localStorage.removeItem('athkar_counters_' + category.id);
          localStorage.removeItem('athkar_cardindex_' + category.id);
          localStorage.removeItem('athkar_counters_v2_' + category.id);
          localStorage.removeItem('athkar_cardindex_v2_' + category.id);
          if (window.MainMenu?.renderMainMenu) window.MainMenu.renderMainMenu();
        });
        sheikhDropdown.appendChild(item);
      });

      sheikhBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !sheikhDropdown.classList.contains('hidden');
        document.querySelectorAll('.sheikh-dropdown-popup').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.thikr-card').forEach(el => el.style.zIndex = '');
        if (!isOpen) {
          sheikhDropdown.classList.remove('hidden');
          card.style.zIndex = '50';
        }
      });

      sheikhWrap.appendChild(sheikhBtn);
      sheikhWrap.appendChild(sheikhDropdown);
      card.appendChild(sheikhWrap);
    }
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

function renderOptionsBtn(root) {
  const wrap = document.createElement('div');
  wrap.className = 'relative';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'menuOptionsBtn';
  btn.className = 'flex items-center justify-center p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors';
  btn.setAttribute('aria-label', 'خيارات');
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="1"/>
      <circle cx="12" cy="5" r="1"/>
      <circle cx="12" cy="19" r="1"/>
    </svg>
  `;

  const dropdown = document.createElement('div');
  dropdown.id = 'menuOptionsDropdown';
  dropdown.className = [
    'absolute top-full right-0 z-50 mt-2 min-w-[160px] rounded-xl shadow-lg py-1',
    menuOptionsOpen ? '' : 'hidden',
  ].join(' ');

  const contactItem = document.createElement('button');
  contactItem.type = 'button';
  contactItem.className = 'block w-full px-4 py-2.5 text-right text-sm font-semibold hover:bg-cyan-500/10 transition-colors';
  contactItem.textContent = 'تواصل معنا';
  contactItem.addEventListener('click', () => {
    menuOptionsOpen = false;
    renderMainMenu();
    const contactPopup = document.getElementById('contactPopup');
    if (contactPopup) {
      contactPopup.classList.add('open');
    }
  });
  dropdown.appendChild(contactItem);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuOptionsOpen = !menuOptionsOpen;
    menuCityOpen = false;
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
  const hasRealTimes = prayerTimes && prayerTimes !== PLACEHOLDER_PRAYER_TIMES && prayerTimes.Fajr !== '00:00';
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
  header.className = 'mb-8 grid grid-cols-3 items-center w-full relative';

  const rightCol = document.createElement('div');
  rightCol.className = 'flex justify-start';
  renderOptionsBtn(rightCol);

  const centerCol = document.createElement('div');
  centerCol.className = 'flex justify-center';
  const logo = document.createElement('img');
  logo.src = 'images/logo.png';
  logo.alt = 'أذكارنا';
  logo.className = 'h-20 w-auto object-contain';
  centerCol.appendChild(logo);

  const leftCol = document.createElement('div');
  leftCol.className = 'flex justify-end';
  renderCitySelector(leftCol, cityLabel);

  header.appendChild(rightCol);
  header.appendChild(centerCol);
  header.appendChild(leftCol);
  section1.appendChild(header);

  const countdownBlock = document.createElement('div');
  countdownBlock.className = 'mb-6 text-center';
  if (hasRealTimes) {
    countdownBlock.innerHTML = `
      <p class="mb-2 text-base font-semibold opacity-85">بقي على ${nextPrayer.name}</p>
      <p id="menuCountdown" class="text-5xl font-black tracking-tight" dir="ltr">${formatMenuCountdown(diff)}</p>
    `;
  } else {
    countdownBlock.innerHTML = `
      <p class="mb-2 text-base font-semibold opacity-85">جاري تحديد مواقيت الصلاة...</p>
      <p id="menuCountdown" class="text-5xl font-black tracking-tight" dir="ltr">--:--:--</p>
    `;
  }
  section1.appendChild(countdownBlock);

  const prayerRow = document.createElement('div');
  prayerRow.className = 'flex flex-wrap items-start justify-center gap-x-4 gap-y-2 text-sm font-bold opacity-90';
  PRAYER_ROW_KEYS.forEach((key) => {
    const timeStr = hasRealTimes ? prayerTimes[key] : null;
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
    const currentTimes = window.AthkarApp?.getPrayerTimes?.() || PLACEHOLDER_PRAYER_TIMES;
    const currentHasReal = currentTimes && currentTimes !== PLACEHOLDER_PRAYER_TIMES && currentTimes.Fajr !== '00:00';
    if (currentHasReal) {
      const currentNext = getNextMenuPrayer(currentTimes);
      const remaining = Math.max(0, currentNext.time - new Date());
      countdownEl.textContent = formatMenuCountdown(remaining);
    } else {
      countdownEl.textContent = '--:--:--';
    }
  }, 1000);
}

function stopMenuCountdown() {
  if (menuCountdownInterval) {
    clearInterval(menuCountdownInterval);
    menuCountdownInterval = null;
  }
}

document.addEventListener('click', (e) => {
  let changed = false;
  if (!e.target.closest('#menuCityBtn') && !e.target.closest('#menuCityDropdown')) {
    if (menuCityOpen) {
      menuCityOpen = false;
      changed = true;
    }
  }
  if (!e.target.closest('#menuOptionsBtn') && !e.target.closest('#menuOptionsDropdown')) {
    if (menuOptionsOpen) {
      menuOptionsOpen = false;
      changed = true;
    }
  }

  if (!e.target.closest('.sheikh-dropdown-popup') && !e.target.closest('.z-20')) {
    document.querySelectorAll('.sheikh-dropdown-popup').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.thikr-card').forEach(el => el.style.zIndex = '');
  }

  if (changed) {
    renderMainMenu();
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

// Auto-run main menu render immediately on script execution to detect cached times
if (typeof window !== 'undefined') {
  renderMainMenu();
}
