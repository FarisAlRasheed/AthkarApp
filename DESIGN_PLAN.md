# أذكارنا — Design Plan: calm, alive, light on the phone

> Written 2026-09-26. Companion to `APP_PLAN.md` (what the app does); this file is how it looks,
> moves, sounds and feels. Where `DESIGN_PROMPT.md` disagrees (its "no animations" rule, its
> colour table), this file wins.
> Applies to the Expo app in `mobile/` only.

---

## 0. Decisions (2026-09-25/26)

| Topic | Decision |
|---|---|
| Ambition | A strong, recognisable look — but slow and quiet. **Performance comes before every effect.** |
| Skia | Allowed. `@shopify/react-native-skia` ships in Expo Go, so no dev build is needed for it. |
| Sound | Optional natural sounds (beads, birds, breeze, rain). **Every sound can be turned off.** No musical tones, chimes or bells. |
| Ornament | Islamic geometric ornament allowed (the eight-point star, «الخاتم»), used sparingly. |
| Progress in the sky | Allowed, as long as it costs nothing while you read (see §2.1 "Journey"). |
| Hijri calendar | In scope: Hijri date on home + special days (Friday, الأيام البيض، Ramadan, العشر، عرفة، العيد). |
| Book & reciter | Not pickers on the home rows. The row *shows* the book; choosing happens in onboarding, Settings and the reader's ☰; the reciter picker moves into the player once there is more than one reciter. |
| Build order | Foundation & performance → Reader → Living sky → Home & calendar → Tasbih → Sound (§11). |

## 1. Principles

1. **Calm over clever.** Motion has weight, not bounce. Nothing flashes, nothing loops fast.
2. **Performance is part of calm.** A dropped frame or a late tap breaks the moment more than a missing effect. Every effect has a cheaper fallback (§6).
3. **The sky is the clock — and the progress.** The sky follows prayer times everywhere; inside the reader it also follows how far you are through the collection.
4. **The bead is the unit.** Beads show progress everywhere: the collection thread in the reader, the counter, the misbaha, the home rows.
5. **Motion carries meaning.** Words that are finished *rise* (﴿إليه يصعد الكلم الطيب﴾ — فاطر ١٠); moving between athkar only *slides*. The two are never mixed.
6. **Worship, not a game.** No confetti, points, streaks or totals. Endings are quiet. Silence is a feature.

## 2. Identity

### 2.1 The living sky

One sky drawn once, behind every screen (§6.2), in a single Skia canvas.

**Sky keyframes** — the gradient is interpolated between these anchors every minute, so the sky
changes as slowly as the real one. The five UI themes (`THEMES` in `theme.ts`: text, paper, accent
colours) still switch at their boundaries; only the sky itself is continuous.

| Key | Anchored at | Look |
|---|---|---|
| `night` | Isha + 60 min → Fajr − 40 min | near-black indigo, full stars |
| `predawn` | Fajr − 20 min | indigo, faint blue at the horizon |
| `dawn` | Fajr | deep blue top, rose/peach band spreading along the horizon (true dawn is horizontal) |
| `sunrise` | Sunrise | light blue top, warm orange horizon, sun at the edge |
| `morning` | Sunrise + 60 min | clear blue |
| `noon` | Dhuhr | brightest, palest horizon |
| `asr` | Asr | warm gold |
| `golden` | Maghrib − 40 min | amber into rose |
| `maghrib` | Maghrib | violet → coral, sun at the horizon |
| `dusk` | Maghrib + 25 min | deep blue-violet, first stars |

Each key is four colour stops, so any two can be blended stop by stop. A pinned theme (Settings)
pins the sky to that theme's representative key.

**Celestial layer**

- **Sun** — soft disc with a radial halo (Skia `RadialGradient`), warmer and larger near the
  horizon. Its position comes from the time between sunrise and maghrib. Time flows right → left
  (RTL), so it rises on the right and sets on the left, matching the home arc (§7.2).
- **Moon** — drawn with its **real phase**, computed from the date (synodic month from a known new
  moon; no network, no Hijri dependency). Lit part via two arcs in a Skia path, soft halo.
- **Stars** — full tier: ~60 stars in three sizes, split into **4 twinkle groups**; each group's
  opacity follows a slow sine (periods 3–9 s, different phases), so only 4 values animate per
  frame. Stars fade in from `dusk` and out at `dawn`.
- **Clouds** — 3 soft, pre-blurred cloud images drifting about one screen-width every 4 minutes;
  visible by day, faint at asr, gone at night.
- **Shooting star** — night only, home and tasbih only (never the reader), random every 3–8 min, 0.9 s.
- **Asr light** — two or three faint diagonal rays from the sun, breathing over 8 s.
- **Fajr horizon** — a wide soft glow at the bottom edge that brightens through `predawn → sunrise`.

Placement: the body stays out of the header controls (clamped away from 56 px at each edge in the
header row) and is drawn behind content with a halo, so overlaps look like sky, not a glitch.
Home hides the global sun/moon because the day arc shows it (§7.2).

**Scenes** — screens tell the sky what to show (`useSkyScene`, §6.2):

| Scene | Used by | Behaviour |
|---|---|---|
| `clock` | home, prayer, settings, tasbih | sky follows the time |
| `journey` | reader | sky follows the collection's progress (below) |
| `threshold` | collection opening | current sky dimmed 25 % |
| `still` | reduce-motion / "still" quality | gradient only, updated per minute |

**Journey** (the reader). The sky tells the collection's story instead of the clock, and only
changes at the moment a thiker completes — nothing animates while you read, so it costs nothing.

| Collection | Progress 0 → 1 |
|---|---|
| أذكار الصباح | `dawn` → `sunrise` → `morning`; the sun climbs from the horizon to about a third of the sky |
| أذكار المساء | `asr` → `golden` → `maghrib` → `dusk`; the sun sets; **one star appears per completed thiker** |
| أذكار النوم | `night`; the screen dims step by step (overlay 0 → 35 %), the paper turns warm (§2.5), the moon stays |
| أذكار بعد الصلاة | the current `clock` sky with a soft horizon glow that grows with progress |

Entering the reader blends from the current sky through `threshold` into the journey start
(1.2 s), so it never jumps.

### 2.2 The bead

One shape used across the app, drawn once as sprites (§7.4) or as simple circles:

- **Collection thread** — top of the reading card: one small bead per thiker (§7.3).
- **Counter** — a ring split into segments for small counts (§7.3).
- **Misbaha** — the tasbih screen (§7.4).
- **Home rows & suggestion** — a thin bead thread shows progress instead of a plain bar.

### 2.3 Ornament — «الخاتم»

The eight-point star (two overlapping squares), drawn as thin lines only.

- Reading card: quarter-rosette line ornaments in the four corners, 1 px, `ornament` colour, static.
- Fadl tab: a small khatam between «الفضل» and «الدليل».
- Collection ending: a large khatam that draws itself (stroke offset, 1.2 s) and then glows softly.
- Special-day card icon.
- Never filled, never gold gradients, never a full tessellated background. Keep it under ~8 % of the screen's visual weight.

### 2.4 Typography

| Role | Font | Notes |
|---|---|---|
| UI | IBM Plex Sans Arabic 400/500/600 | unchanged |
| Titles | Amiri 700 | unchanged |
| Athkar text | **User choice**: Noto Naskh Arabic (default), Amiri, Scheherazade New | Scheherazade is already loaded and unused today |
| Quran (`quran: true`) | KFGQPC Hafs V30 (`mobile/assets/fonts/KFGQPC-Hafs-V30.ttf`, 300 KB) | Only with text from the same release — see §13 Q5 |

- **Quranic athkar**: text in `paperText` (no longer all green); the basmalah on its own line,
  centred, 0.85× size; verse numbers drawn by the font from «۝١»; a small «من القرآن» label in the
  `quran` colour.
- **Never show a lone «٠» at display size** — the Arabic zero is a dot. Reader: a finished count
  shows ✓. Tasbih at zero shows «ابدأ».
- Countdown and counts use tabular digits. Captions never below 12 pt (prayer cells are 11 today).

### 2.5 Colour tokens (additions to `Theme`)

| Token | Use |
|---|---|
| `glow` | halos, light motes, the completion glow |
| `ornament` | khatam lines (paper border at ~60 %) |
| `quranMark` | ayah markers and the «من القرآن» label |
| `dim` | the sleep journey's dimming overlay (black) |
| `paperWarm` / `paperWarmText` | the sleep journey's warm dark paper (≈ `#231d16` / `#f1e6d2`, lower blue light) |

Sky gradients live in a separate `SKY_KEYS` table (§2.1), not in `THEMES`.
A unit test checks contrast for every theme: body text ≥ 4.5 : 1 on paper and on the sky's lightest
and darkest stops; captions ≥ 3 : 1.

## 3. Motion system

Tokens go in `theme.ts` as `motion`; no screen hard-codes springs again.

```ts
export const motion = {
  duration: { tap: 120, quick: 220, base: 360, calm: 600, slow: 1000, breath: 6000 },
  easing: { enter: Easing.out(Easing.cubic), exit: Easing.in(Easing.quad), drift: Easing.inOut(Easing.sin) },
  spring: {
    settle: { damping: 22, stiffness: 220, mass: 0.9 }, // ζ≈0.78 — controls; ≤2 % overshoot
    gentle: { damping: 26, stiffness: 120, mass: 1 },   // ζ≈1.19 — sheets, cards; no overshoot
    bead:   { damping: 15, stiffness: 280, mass: 0.5 }, // ζ≈0.63 — beads only; a small physical "click"
  },
  press: { card: 0.98, button: 0.96, icon: 0.92 },
};
```

For comparison, today's springs are bouncier than "calm": the press release is ζ≈0.48 (~18 %
overshoot), the ring bump ζ≈0.30, icon buttons shrink to 0.86 and the tasbih count pops to 1.1.

**Rules**

1. Nothing scales above 1.03 (halos excepted). UI overshoot ≤ 2 %; only beads may overshoot (~8 %).
2. Entering uses `enter` easing; exiting is faster than entering (≈ 60 % of the duration).
3. Ambient motion has periods ≥ 3 s and small amplitude. No fast infinite loops.
4. Everything is interruptible: springs retarget; visual sequences use `withDelay`/`withSequence`
   on the UI thread, not `setTimeout` + state.
5. Input never waits for an animation — with one deliberate exception: the reader's 450 ms settle
   guard after an auto-advance (§7.3).
6. Reduce motion (OS setting, via Reanimated's `useReducedMotion`) replaces movement with ≤ 200 ms crossfades.
7. The staggered home entrance runs on cold start only, not on every return to home.

## 4. Haptics

One module (`lib/feel.ts`) owns every haptic; screens call `feel.count()`, `feel.complete()` etc.
iOS uses `expo-haptics` impacts; Android uses `performAndroidHapticsAsync` (native haptic engine,
no vibrate permission), falling back to `impactAsync` where the constant isn't supported by the OS
version. Initial mapping — **to be tuned on your phones in a /lab haptics screen** (§11 D0):

| Event | iOS | Android |
|---|---|---|
| Reader count | `impact(Light)` | `Keyboard_Tap` |
| Milestone — every 10th count when the target is ≥ 30 | `impact(Medium)` | `Context_Click` |
| Thiker complete ("double beat") | `Medium`, then `Soft` after 110 ms | `Confirm` |
| Collection complete ("rising") | `Soft`, `Soft`, `Medium` at 140 ms spacing | `Confirm` ×2 |
| Tasbih bead | `selectionAsync()` | `Segment_Tick` (fallback `Clock_Tick`) |
| Tasbih separator bead | `impact(Rigid)` | `Virtual_Key` |
| Tasbih round (imam bead) | double beat | `Confirm` |
| Tab switch / toggle | `selectionAsync()` | `Toggle_On` / `Toggle_Off` |
| Buttons, pills, navigation | none | none |

Setting: «الاهتزاز» on by default. Haptics are never the only feedback for anything.

## 5. Sound (all optional, all switchable)

**Effects** — short, bundled, played from a pool of 3 preloaded `expo-audio` players per sample
(round-robin, so fast taps don't cut each other off):

| Sound | When | Default |
|---|---|---|
| Bead click (3 variants, picked at random) | each tasbih tap — at the tap, not on arrival, so it never lags | off |
| Separator clack | separator bead | off (follows bead setting) |
| Imam bead | round complete | off (follows bead setting) |
| Soft wooden tap (2 variants) | reader count | off, its own toggle |
| — | thiker / collection complete | **silence**, by design |

**Ambient** — seamless 60–90 s loops, AAC mono ~64 kbps (~0.5 MB/min), low volume (default 35 %),
crossfading over 4 s at theme boundaries. Plays in the **reader and tasbih only**; home stays silent.

| Sky | Ambient |
|---|---|
| الفجر | sparse early birds |
| الصباح | light breeze, distant birds |
| العصر | warm breeze, leaves |
| المغرب | birds settling |
| الليل | soft crickets |
| (any time) | rain — optional choice |

v1 bundles only three loops (fajr birds, night crickets, rain) to keep the app small; the rest can
arrive later with content updates.

**Audio mode.** Today the app sets `doNotMix` at launch. Plan: default `mixWithOthers` (effects and
ambient never stop the user's own audio); switch to `doNotMix` only while a recitation plays (lock-screen
controls require it), and back when the player stops. Ambient fades to 0 over 800 ms while a
recitation plays and returns after. The effects players must be ready before the first tap
(latency target < 60 ms — measured in /lab).

**Settings** («الأصوات والاهتزاز»): الاهتزاز · أصوات المسبحة · صوت العدّ في الأذكار · الأصوات المحيطة
(تلقائي حسب الوقت / مطر / بلا) · مستوى الصوت (منخفض / متوسط / مرتفع).

## 6. Performance (the priority)

### 6.1 Targets

- **Reference weak device** — see §13 Q2. Until then: a ~2020 Android with 3 GB RAM (e.g. Galaxy A12)
  and the oldest iPhone SDK 57 supports.
- Counting, scrolling and screen changes: **60 fps** on the reference device in a release build.
  Completion sequences: ≥ 50 fps on the "lite" tier.
- **JS thread idle when you're not touching the screen**: one clock ticking per minute, plus a
  per-second tick only inside the countdown text during its last 10 minutes.
- Taps: 8 taps/second on the reader and tasbih without a single dropped or double count.
- Sky + sprites + sounds: under ~30 MB of memory.

### 6.2 Architecture changes

1. **One clock, one theme.** Today every `T`, `Press`, `Pill`, `Card` and `IconButton` calls
   `useTheme()`, and each call starts its own `setInterval` (`useNow(60_000)`) and computes prayer
   times — hundreds of timers on the home screen. Replace it with one small store: a single timer
   aligned to the minute updates `now`, today's times and the theme id; `useTheme()` becomes a plain
   selector.
2. **Countdown in its own component.** Home re-renders everything every second today
   (`useNow(1000)` at the top). Only the countdown text should.
3. **One sky behind the navigator.** Move the sky from each `SkyScreen` into `_layout.tsx`, behind
   the `Stack`, with transparent screens. Screens set the scene with `useSkyScene()` on focus. Stacked
   screens stop drawing their own skies, and transitions look calmer because the sky stays put while
   content crossfades.
4. **UI-thread only for anything that moves.** Reanimated shared values and Skia; no React state
   per frame; sequences via `withDelay`/`withSequence`.
5. **Gestures on the UI thread.** Replace the reader's JS touch handlers (`onTouchStart/Move/End`
   in `SwipeCard`) with `react-native-gesture-handler` Tap + Pan gestures — cheaper, and more
   reliable at telling a tap from a swipe.
6. **Pause what you can't see**: ambient animation stops when the app is backgrounded
   (`AppState`), when a screen is unfocused, and in the lite/still tiers.
7. **Splash until ready.** Keep the splash (`expo-splash-screen`) until fonts *and* the persisted
   stores have loaded. Today the app shows a blank screen while fonts load, and can briefly show
   empty progress before AsyncStorage hydrates.
8. **Draw once, reuse.** Bead materials, cloud shapes and halos are rendered once into images
   (Skia offscreen) at first use and cached; the misbaha is one Skia `Atlas` draw call.

### 6.3 Quality tiers

Detected at first launch: **lite** if `Device.totalMemory` < 3 GB, `Device.deviceYearClass` < 2019,
or Android API < 28; otherwise **full**. A runtime check samples the first 10 s of sky animation
(`useFrameCallback`); if more than 20 % of frames are slow (> 25 ms) it drops to lite and remembers.
The OS reduce-motion setting forces **still**. Settings: «جودة المؤثرات: تلقائي / كاملة / خفيفة».

| Effect | Full | Lite | Still |
|---|---|---|---|
| Sky gradient | continuous, 2 s blend per minute | per-minute, instant | per-minute, instant |
| Stars | ~60, twinkling (4 groups) | ~25, static | ~25, static |
| Clouds | 3, drifting | 2, static | 2, static |
| Shooting star, Asr rays | yes | no | no |
| Tap ripple | up to 3 at once | 1 | none |
| Rolling digits | roll | crossfade | instant |
| Thiker completion | rise + glow + motes | rise only | crossfade |
| Journey sky | 1.2 s blend at each completion | instant step | instant step |
| Misbaha | chain ripple + round wave | beads move, no ripple/wave | beads jump |
| Collection ending | full sequence | shorter, no star draw | static |

### 6.4 Measuring

Release builds only (dev builds are much slower). Android: Flashlight or `adb shell dumpsys
gfxinfo`; iOS: Instruments. /lab gets an FPS meter overlay (via `useFrameCallback`) that can be
turned on over any screen.

## 7. Screens

### 7.1 Launch & onboarding

- **Splash** — sky colour of the current time + logo; fades into home (400 ms) once ready.
- **Onboarding** (first launch only, three steps on the sky, content crossfades with a 12 px rise):
  1. «أذكارنا» + one line: «أذكار الصباح والمساء والنوم، في وقتها.» → «ابدأ»
  2. **Choose the book**: two cards — «الشيخ ابن باز» (default, "shorter and easier", counts read from
     content: ١٩ / ٢٠) and «الشيخ ابن عثيمين» (٢٦ / ٢٥). «يمكنك تغييره لاحقًا من الإعدادات».
  3. **Location**: the existing explanation → «استخدام موقعي» / «اختيار مدينة» / «لاحقًا».
- Stored as `onboarded: true` (settings store `version` 2 with a migration).

### 7.2 Home

Top to bottom:

1. **Header** — «أذكارنا» (Amiri 28, right), settings (left). Under the title:
   «الجمعة ١٤ ربيع الآخر ١٤٤٨ · ٢٥ سبتمبر» (Hijri first, §8).
2. **Countdown** — «بقي على العصر» above a large «١:٢٣» (h:mm). Under an hour: «٢٣ دقيقة».
   Under 10 minutes: «٩:٤٥» ticking. No seconds otherwise — a ticking clock works against calm.
3. **The day arc** («قوس اليوم») — drawn directly on the sky (no card), ~120 px tall:
   - **Day mode (Fajr → Maghrib)**: a curve from Fajr (right, just below a faint horizon line) up
     through Sunrise, Dhuhr at the apex, Asr, down to Maghrib (left, on the horizon). The travelled
     part is drawn brighter; the **real sun** sits at the current time with its halo.
   - **Night mode (Maghrib → Fajr)**: the arc becomes the night — Maghrib, Isha, «منتصف الليل» at the
     apex, «الثلث الأخير من الليل», Fajr — with the **moon in its real phase** travelling along it.
     Midnight and the last third come from `adhan`'s `SunnahTimes`.
   - The next prayer's dot breathes slowly (opacity 0.5 ↔ 1 over 3 s; static on lite).
   - Below the arc: the six times in a row (as today), next one highlighted — the arc is for
     feeling, the row is for reading.
   - Tapping the arc or the row opens Prayer times.
4. **Special-day card** — only on special days (§8): a slim glass card with a small khatam, one
   line, and an action when there is one (e.g. opens the tasbih on «اللهم صلِّ على محمد»).
5. **Suggestion card** — «المقترح الآن», the collection title (Amiri 30), a bead thread for progress,
   and one clear action pill: «ابدأ» or «أكمل · ٥ من ١٩» with a ‹ chevron. Listening is a separate
   headphones button («استمع»), so ▶ no longer means two things. When everything is done: «أتممت أذكار
   الوقت» + the next collection's time + «المسبحة».
6. **All collections** — each row:
   - a 32 px **sky chip** (a tiny gradient of that collection's time with its sun or moon)
   - title (Amiri 19) and a caption: «ابن باز · ١٩ ذكرًا» / «٥ من ١٩» / «تمّت لهذا الوقت»
   - partial: a thin bead thread along the bottom edge + the «إكمال» pill
   - done: a soft `glow` border and a ✓ on the chip
   - a headphones button pinned to the left edge (fixes today's floating ▶, §10)
7. **Tasbih row** — chip with a bead; caption shows the current phrase and count: «سبحان الله · ١٢».

### 7.3 Reader (the core screen)

**Layout (390 × 844 reference)**

```
┌─────────────────────────────────┐
│ ☰         أذكار المساء       ›  │  sky band: clamp(16 % of height, 96, 150) px
│        ✦        ·   ✦           │  sun / stars of the journey live here
│   ترجمة الذكر  الذكر  فضل الذكر  │  tabs — «الذكر» always centred
│ ┌─────────────────────────────┐ │
│ │ ●●●●◉○○○○○○○○○○○○○○  ٥ / ١٩ │ │  collection thread → tap opens the list
│ │          آية الكرسي          │ │  thiker title (caption)
│ │                             │ │
│ │        thiker text          │ │  hero; scrolls if long; tap anywhere = +1
│ │                             │ │
│ │   ✦ تحمي من الشيطان حتى يمسي │ │  virtue teaser (one line) → opens the fadl tab
│ │  ↺          (٣)          🎧  │ │  reset · counter · audio
│ └─────────────────────────────┘ │
│  [ player, when audio is on ]   │
└─────────────────────────────────┘
```

- **Tabs**: always three slots; the translation slot stays invisible until translations exist, so
  «الذكر» is centred (today it sits off-centre).
- **Collection thread**: one 6 px bead per entry — done = filled accent, current = larger with a ring,
  partial = half-filled, untouched = outline. Over 30 entries it shows a window around the current
  one. The marker slides to the next bead with the `settle` spring.
- **Card**: `paper`, radius 28, corner khatam ornaments (§2.3).

**Counting**

- **Counter** (88 px, stroke 6): targets ≤ 12 use a **segmented ring** (one segment per count,
  small gaps); each tap sweeps the next segment in 280 ms. Larger targets use the continuous ring (420 ms).
- **Rolling digit**: the old number moves up 10 px and fades (180 ms) while the new one rises in (200 ms).
- **Ink ripple**: each counting tap spreads a circle from the finger — radius 8 → 140, 900 ms,
  opacity 0.16 → 0, accent colour. A pool of 3 reusable views; no allocation per tap.
- **Milestones**: when the target is ≥ 30, every 10th count gives a Medium haptic and a faint
  ring glow (500 ms) — you can count ١٠٠ without looking.
- **Settle guard**: after an auto-advance, taps are ignored for 450 ms while the new thiker arrives;
  the counter shows at 50 % opacity until it's ready. (Today a rhythmic tapper's next tap lands on
  the new thiker ~350 ms after it appears, before it has been read.)

**Thiker completion** (full tier; ms from the final tap)

| t | What happens |
|---|---|
| 0 | double-beat haptic; the ring closes; ✓ draws itself (220 ms) |
| 180 | the text **rises**: up 36 px and fades out over 650 ms (`drift` easing); a soft glow swells behind it and fades |
| 250 | 6 light motes lift from the text into the sky band and fade (1.1 s) — drawn in a full-screen overlay so they can leave the card |
| 700 | the next thiker enters: opacity 0 → 1, up 16 px → 0, 450 ms; the thread marker slides |
| 700–1150 | settle guard |
| 900 | the journey sky takes its step (a star appears / the sun climbs), 1.2 s blend |

Lite: rise only, next thiker at 300 ms. Still: 200 ms crossfade. Completion by audio runs the same
sequence. Manual moves (swipe, list, player ‹ ›) never rise — they slide 250 ms in the direction of
travel.

**Opening moment** — the first time each day a collection starts fresh (untouched this period): the sky dims
(`threshold`), the title fades in (Amiri 34) with one verse under it (§12), 1.6 s, then the card
rises into place (600 ms). A tap skips it. Not shown when resuming, nor with reduce motion.

**Collection ending** (replaces today's completion screen)

1. The card lowers and fades (500 ms); the sky fills the screen.
2. A large khatam draws itself (1.2 s) and glows.
3. «تقبّل الله منك» (Amiri 34) fades in at +600 ms, with a line per collection (§12).
4. At +1400 ms: «العودة للرئيسية» (primary) and «ابدأ من جديد» (secondary).

Per collection: **morning** — full daylight floods in; **evening** — the remaining stars appear in a
slow cascade (60 ms apart); **sleep** — the screen dims to 40 % over 3 s and stays warm and dark;
**post-prayer** — a soft glow, and the line shows the next prayer.

**Fadl tab**: «الفضل» (19 pt) → small khatam → «الدليل» (athkar font) → source line + grade chip
coloured by grade. When a thiker has neither yet, the tab label is muted and the body shows a
quiet ornament with «لم يُضف فضل هذا الذكر بعد».

**Sheets** (all of them): the dim backdrop *fades* (200 ms) while the sheet springs up (`gentle`);
a drag handle; swipe down closes as a shortcut (the × stays). Today the RN `Modal` slides the dark
backdrop up together with the sheet.

**Reader ☰ menu**: book, **athkar font with a live preview line**, font size, reciter.

### 7.4 Tasbih — a real misbaha

**Layout**: top bar (back, «المسبحة», reset) → the phrase (tap to change; the hint «اضغط لتغيير
الذكر» only on the first three visits) → the count → the misbaha → target pills + focus-mode button.

**Count**: 88 pt. At zero: «ابدأ» (never the «٠» dot). Below: «من ٣٣» and rounds «٢ × ٣٣».

**The string**
- A thread drawn as a hanging curve (Skia path) across the screen.
- **Two clusters**, like sliding beads by hand: remaining beads packed on the right, counted beads
  packed on the left, a gap in the middle. Each tap sends the next bead across the gap; it clicks
  into the counted cluster and the clusters shift by one.
- All bead positions come from **one** spring-driven value (the animated count), so fast taps just
  retarget it — beads in flight never jump and no tap is ever blocked. Full tier adds a small chain
  ripple (each neighbour a few ms later, decaying).
- Only the ~14 beads on screen are drawn, in one Skia `Atlas` call.
- **Real structure**: separator beads (capsule-shaped) at 11 and 22 for a 33 string; at 33 and 66
  for 99 and 100; every 33 for "no limit". The **imam bead** (larger, elongated) with a **tassel**
  («الشرابة», a few thin strands that sway with a spring) marks the target.
- **Round complete** (imam bead arrives): double-beat haptic; a gentle wave travels along the string
  (6 px, 900 ms); the phrase glows once; the rounds label rolls; then the string glides back to the
  start (700 ms). Taps during this count normally and simply retarget.

**Materials** (Settings → المسبحة, and a bead button on the screen): كهرمان (translucent amber,
glows softly at night), خشب (wood grain), لؤلؤ (pearl sheen), يسر أسود (glossy black), فيروز
(matte turquoise). Each rendered once into a sprite at 3× size and cached (§6.2).

**Focus mode** («وضع التركيز»): the screen fades to near-black (92 %) over 600 ms; the count stays
faint; the whole screen counts; haptics and optional clicks carry you; a faint «إنهاء» button exits
(a visible control, per the plan's gesture rule). The screen stays awake.

**Sequence mode** — «تسبيح دبر الصلاة» in the phrase picker: سبحان الله ×٣٣ → الحمد لله ×٣٣ →
الله أكبر ×٣٣ → «لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير» ×١.
Step dots show where you are; each finished phrase rises like a completed thiker; the last step ends
with «تقبّل الله». Stored in `tasbih.json` as `sequences`.

**Drag** (shortcut, phase T2): dragging a bead from right to left by one bead-width counts one; the
bead follows the finger and springs into place on release.

### 7.5 Prayer times

The same day/night arc, larger; the six rows; at night two extra rows: «منتصف الليل» and «الثلث
الأخير من الليل». Location and method as today.

### 7.6 Settings

Grouped cards with a small icon per group:

- **الموقع ومواقيت الصلاة** (as today)
- **الكتاب والقارئ** — the book for morning / evening; the reciter
- **المظهر والحركة** — theme (auto / pinned); «جودة المؤثرات»; athkar font (with preview); font size
- **الأصوات والاهتزاز** — §5
- **المسبحة** — bead material
- **التقويم** — «تعديل التاريخ الهجري» (−٢ … +٢ days)
- **الإشعارات** (phase 2), **مسح كل التقدم**, **تواصل مع المطور**

## 8. Islamic calendar

- **Hijri date**: Umm al-Qura. Generate `hijri-table.ts` at build time with Node's full ICU (the
  month starts for 1440–1500 AH, ~5 KB), and convert with it on the phone. This avoids depending on
  Hermes' `Intl` calendar support (`isRamadan()` in `lib/prayer.ts` relies on it today and silently
  returns false if it's missing — switch it to the table too).
- **Adjustment**: −2 … +2 days in Settings, for places that follow local moon sighting.
- **Day boundary**: the displayed date is civil (changes at midnight). Special *nights*
  (ليلة الجمعة، ليالي العشر الأواخر) start at Maghrib.
- **Special days** — texts live in `content/calendar.json` (so they can be edited like other
  content); texts below are drafts for you to approve (§13 Q6):

| Day | When | Card | Action |
|---|---|---|---|
| الجمعة | Thu Maghrib → Fri Maghrib | «يوم الجمعة — أكثِروا من الصلاة على النبي ﷺ، واقرؤوا سورة الكهف» | tasbih: الصلاة على النبي |
| الأيام البيض | 13–15 of each month (card from the 12th evening) | «الأيام البيض — صيام ثلاثة أيام من كل شهر» | — |
| رمضان | all month | countdown emphasises «الإفطار» (Maghrib) and «السحور» (Fajr) | — |
| العشر الأواخر | Ramadan nights 21–30 | «تحرَّوا ليلة القدر» + «اللهم إنك عفوٌّ تحب العفو فاعفُ عني» | tasbih preset |
| عشر ذي الحجة | 1–13 Dhul-Hijjah | «أكثِروا من التكبير والتهليل والتحميد» | tasbih: التكبير |
| يوم عرفة | 9 Dhul-Hijjah | «خير الدعاء دعاء يوم عرفة» + the tahleel | tasbih preset |
| العيد | 1 Shawwal; 10 Dhul-Hijjah | «تقبّل الله منا ومنكم» | tasbih: التكبير |
| عاشوراء | 9–10 Muharram | «صيام عاشوراء» | — |
| الاثنين والخميس | from the evening before (Maghrib) until Maghrib | «صيام الاثنين والخميس» — only when no other special day is showing | — |

New tasbih phrases needed: التكبير (الله أكبر الله أكبر لا إله إلا الله…), دعاء العفو, the full tahleel.

- **Moon phase** for drawing comes from astronomy (§2.1), not from this table.

## 9. Accessibility

- Every animated state also exists as text or a static mark (✓, «٥ من ١٩», rounds label).
- Screen readers: the counter reads «المتبقي ٣»; completion announces «اكتمل الذكر، التالي: …».
- Reduce motion → the still tier (§6.3). Haptics and sounds are never the only feedback.
- Tap targets ≥ 44 pt; athkar text ≥ 18 pt; captions ≥ 12 pt; contrast checked by a unit test (§2.5).

## 10. Bugs and debts found on 2026-09-25

| Where | Problem | Fix |
|---|---|---|
| `components/ui.tsx:74`, `app/index.tsx:146` | `Press` puts `style` on its inner view, so `flex: 1` never reaches the pressable — the row ▶ floats mid-row | give `Press` a separate outer style (layout) and inner style (look) |
| `app/tasbih.tsx:97`, `app/read/[collection].tsx:148` | «٠» renders as a dot at display size | ✓ / «ابدأ» (§2.4) |
| `hooks.ts` `useTheme` | one interval + prayer calculation per component | clock/theme store (§6.2) |
| `app/index.tsx` | whole home re-renders every second | isolate the countdown (§6.2) |
| `app/_layout.tsx:38` | blank screen while fonts load; progress can flash empty before hydration | splash until ready (§6.2) |
| `components/Sky.tsx` | flat grey moon over the settings icon and the card corner | new celestial layer (§2.1) |
| reader tabs | «الذكر» off-centre when translation is hidden | fixed three slots (§7.3) |
| reader | tap after auto-advance counts the unread next thiker | settle guard (§7.3) |
| home | ▶ means "continue" on the suggestion but "play audio" on rows | chevron vs headphones (§7.2) |
| `components/Sheet.tsx` | the dark backdrop slides up with the sheet | fading backdrop (§7.3) |
| tasbih | the target bead isn't marked (APP_PLAN §3.3) | imam bead (§7.4) |
| content | سورة الإخلاص: basmalah without tashkeel, plain digits for verse numbers | Quran text source (§13 Q5) |
| `_layout.tsx` | `doNotMix` set at launch | mode switching (§5) |

## 11. Build order

Each phase ends with lint, typecheck, tests, and a check on the weak device.

**D0 — Foundation & performance** *(everything else stands on this)*
- Clock/theme store; isolated countdown; splash until fonts + hydration.
- Global sky host behind the `Stack` with keyframe gradients and the scene API (no ambient life yet).
- `motion` tokens; `lib/feel.ts`; quality tiers + reduce motion + settings entries.
- Install: `@shopify/react-native-skia` (+ its web CanvasKit setup, so `npm run web` keeps working),
  `react-native-gesture-handler`, `expo-device`, `expo-splash-screen` — all with `npx expo install`.
- /lab: FPS meter, haptics tuning (try each mapping in §4 and pick), effect-sound latency, transparent
  native-stack check on Android.
- Fix the §10 bugs that don't depend on later phases.
- *Done when*: home at rest keeps the JS thread idle; 60 fps scrolling home on the weak device; no
  progress flash at launch.

**D1 — Reader**
- Sky band layout, centred tabs, collection thread, title, virtue teaser, corner ornaments.
- Segmented ring, rolling digits, ripple, milestones, settle guard, gesture-handler taps/swipes.
- Thiker completion sequence, journey scenes, opening moment, collection endings.
- Fadl tab, sheets, font choice; Quran typography (once §13 Q5 is decided).
- *Done when*: 8 taps/s with no lost or double counts; completion ≥ 50 fps on lite; you've read a
  full morning and evening with it.

**D2 — Living sky**
- Keyframe tuning, real moon phase, star groups, clouds, fajr glow, asr rays, shooting stars.
- Runtime downgrade to lite.
- *Done when*: full tier holds 60 fps on a mid device with the reader open; lite on the weak device.

**D3 — Home & calendar**
- Hijri table generator + date line + adjustment; `calendar.json` + special-day card.
- Day/night arc with `SunnahTimes`; suggestion card; rows with book caption and sky chips; onboarding.

**D4 — Tasbih**
- Misbaha rebuild (Atlas, clusters, separators, imam + tassel, wave), materials, focus mode,
  sequence mode; drag last.

**D5 — Sound**
- Effects pool, audio-mode switching, ambient loops and crossfades, settings.
  (Bead clicks can land in D4 if the recordings are ready.)

**D6 — Polish**
- Accessibility pass, full performance pass on the weak device, contrast test, and optionally an app
  icon and splash that use the khatam and the sky.

## 12. Content for you to write or approve

**Opening verses** (shown under the collection title; the exact text is taken from the chosen Quran
source, not typed by hand):

| Collection | Verse |
|---|---|
| أذكار الصباح | فسبحان الله حين تمسون وحين تصبحون — الروم ١٧ |
| أذكار المساء | وسبح بحمد ربك قبل طلوع الشمس وقبل الغروب — ق ٣٩ |
| أذكار بعد الصلاة | فإذا قضيتم الصلاة فاذكروا الله قيامًا وقعودًا وعلى جنوبكم — النساء ١٠٣ |
| أذكار النوم | الذين يذكرون الله قيامًا وقعودًا وعلى جنوبهم — آل عمران ١٩١ |

**Ending lines** (under «تقبّل الله منك»):

| Collection | Line |
|---|---|
| الصباح | «أتممت أذكار الصباح» + «أذكار المساء بعد العصر (٣:١٠ م)» |
| المساء | «أتممت أذكار المساء» + «أذكار النوم بعد العشاء» |
| بعد الصلاة | «تقبّل الله صلاتك» + the next prayer and its countdown |
| النوم | «تصبح على خير» + «ونم على شقك الأيمن» |

**Recordings**: 10–15 single clicks of a real misbaha (amber and wood if you have both), a few
heavier clacks, and a few "imam bead" clicks — quiet room, phone close. I trim and normalise them.

**Also**: the special-day texts (§8), the Quran text source (§13 Q5), and picking haptics in /lab.

## 13. Questions — answered 2026-09-26

1. **Progress in the sky**: visible when you look up (a star per thiker in the evening, the sun
   climbing in the morning); never moves while you read. ✅
2. **Weak test device**: none available — all test phones are fast. So the **automatic tier
   detection and the runtime downgrade (§6.3) are mandatory**, and /lab gets a "force lite" switch
   plus the FPS meter so lite can be checked on a fast phone.
3. **Misbaha**: amber by default; the five materials stay. ✅
4. **Sounds**: you record the misbaha clicks; CC0 recordings are fine for the ambient loops. ✅
5. **Quran text**: the King Fahd Complex **Hafs V30** release you supplied (font "KFGQPC HAFS
   Uthmanic Script", version 3.0, plus the Word document of the whole Quran it ships with).
   - Font: `mobile/assets/fonts/KFGQPC-Hafs-V30.ttf`; text source: `content/sources/KFGQPC-Hafs-V30.docx`.
   - `npm run content:quran` reads the document (114 surahs, 6236 verses, checked in order) and
     writes the verses named by each thiker's `ayahs` into `athkar.json`; the basmalah goes to
     `content/quran.json`. Text and font must always come from the same release.
   - Licence (embedded in the font): free to use and distribute; not to sell or modify.
   - `fonts/UthmanicHafs.ttf` (root web app) was never a font — it is a saved GitHub web page. ✅
6. **Special days**: all of §8, **plus** Monday/Thursday fasting and Ramadan's iftar/suhoor emphasis. ✅
7. **Opening moment**: the first fresh start of each collection **per day** only. ✅
8. **Journey in the reader**: the collection's story, not the literal clock. ✅

## 15. Status — built 2026-09-26 (branch `feat/design-system`)

All of §11 (D0–D6) is built. Typecheck, lint and the unit tests (`mobile/src/lib/logic.test.ts`:
periods, suggestions, prayer times, countdown, Hijri against ICU, special days, the misbaha string,
the sky) pass. In the web build: home, the reader (KFGQPC text, completion, sleep's warm paper and
dimming), sheets, prayer times and the misbaha were checked on screen; onboarding, settings,
notifications, the after-prayer sequence (33 taps → next phrase) and the collection ending were
checked through the page's content, because the preview window was in the background (its
animations were paused) for that part.

**Where things live**

| Plan | Code |
|---|---|
| §2.1 sky, scenes, journey | `lib/sky.ts` (pure), `components/sky/SkyHost.tsx` (one Skia canvas), `store/sky.ts` |
| §3 motion tokens | `theme.ts` → `motion`; `components/ui.tsx` (`Press`, `Ring`) |
| §4 haptics | `lib/feel.ts`; tuning in `/lab` |
| §5 sound | `lib/sound.ts`, `mobile/assets/sounds/`, `scripts/gen-sound-index.mjs` |
| §6 performance | `store/clock.ts` (one clock), `lib/quality.ts` (tiers), `useFrameWatch` in SkyHost, FPS meter in `/lab` |
| §7.1 onboarding | `app/onboarding.tsx` (shown when there is no location and onboarding wasn't finished) |
| §7.2 home | `app/index.tsx`, `components/home/DayArc.tsx` |
| §7.3 reader | `app/read/[collection].tsx`, `components/reader/*` |
| §7.4 misbaha | `app/tasbih.tsx`, `components/tasbih/Misbaha.tsx` (sprite sheet + one Atlas draw), `lib/misbaha.ts` |
| §7.6 settings | `app/settings.tsx`, `app/notifications.tsx` |
| §8 calendar | `lib/hijri.ts` + generated `lib/hijri-table.ts`, `lib/calendar.ts`, `content/calendar.json` |
| Quran text | `content/sources/KFGQPC-Hafs-V30.docx` → `scripts/quran-text.mjs` → `athkar.json`, `collections.json`, `quran.json` |

**Differences from the plan**

- **Ambient loops** are wired in (settings, crossfades, fading out under a recitation) but none is
  bundled yet — the setting shows «قريبًا» until files are added to `assets/sounds/ambient/`.
- **Bead and count sounds** are synthesized placeholders (`scripts/synth-sounds.mjs`) until your
  recordings replace them (same file names).
- **Reminders** (APP_PLAN Phase 2) were built as part of the settings.
- The home sky hides its own sun and moon; the day arc shows them instead (as planned). Other
  screens keep them.

**Still to check on real phones (release builds)**

1. The KFGQPC V30 font on iOS and Android: verse marks («۝١»), tashkeel, line breaks.
2. Haptic patterns — pick the best in `/lab`, then adjust `lib/feel.ts`.
3. Frame rate with `/lab`'s meter: full tier on your phones, then «خفيفة» forced, reading and
   counting fast (8 taps/s) and in the misbaha.
4. Effect-sound latency, and that nothing interrupts music playing in another app.
5. Reminders: permission flow, delivery, and tapping one opens the right collection.
6. The sheet's drag-to-close and the reader's swipes next to scrolling on a real touch screen.

## 14. Later, not now

- Share a thiker as an image on its sky (WhatsApp / Status).
- The current sky as the lock-screen player artwork.
- Home-screen widget (already in APP_PLAN Phase 3).
- Reciter picker inside the player (once there are two reciters).
