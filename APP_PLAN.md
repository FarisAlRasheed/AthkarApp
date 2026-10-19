# أذكارنا — Complete App Plan (Expo rebuild)

> Last updated 2026-09-26. Self-contained: can be pasted into a new chat as full context.
> How the app looks, moves, sounds and performs: `DESIGN_PLAN.md`.
> Supersedes `EXPO_REWRITE_BRIEF.md`. Built from the Notion page «تطوير تطبيق الأذكار», the two
> earlier briefs, and the decisions made while discussing them.

---

## 1. Product

- Arabic athkar app: the user opens it, sees prayer times and the athkar that fit this moment,
  and reads/listens/counts one thiker at a time.
- **Arabic-only UI, RTL only.** Translations (English, Urdu) come later and are *content only* —
  the interface never becomes bilingual.
- **Free, no ads, no account, no tracking.** Everything works offline, including prayer times.
- iOS + Android from one Expo codebase. The current web version stays live until the app ships.

## 2. Decisions log

| Topic | Decision |
|---|---|
| Rewrite | Expo / React Native, native (not a webview). Old animations and 3D flip dropped. |
| App name | **أذكارنا** |
| Home layout | Three parts: prayer times + countdown → big suggested-athkar button → all collections as full-width rows. |
| Home card tap | Tapping a collection **resumes**. "Start over" is a small secondary button. |
| Suggestion windows | See §5.1. Evening starts after Asr. When nothing is due, suggest **المسبحة**. |
| المسبحة | Back as a full feature, designed to be the most satisfying screen in the app (§3.3). |
| Visual direction | **Living sky** (chosen 2026-09-25): every screen sits on a sky gradient that follows the prayer times (dawn, day, golden Asr, sunset, starry night) with glass cards on it; athkar are read on a calm paper card whose tone matches the sky. Titles in Amiri, UI in IBM Plex Sans Arabic, athkar in Noto Naskh. |
| Animations | **Smooth and satisfying throughout** (replaces the earlier no-animation rule): springy presses, staggered entrances, animated count ring with a bump per tap, gliding athkar changes, spring-in completion, fading screen transitions, and the tasbih beads. **Refined 2026-09-26:** calm and weighty rather than bouncy — tokens and rules in `DESIGN_PLAN.md` §3. |
| Design identity | (2026-09-26) The sky follows the time *and*, in the reader, the collection's progress; the bead is the shared visual unit; the eight-point star «الخاتم» as a sparse line ornament; finished athkar rise, moves only slide. Full spec: `DESIGN_PLAN.md`. |
| Performance | (2026-09-26) Comes before every effect. Quality tiers (full / lite / still) chosen by device and reduce-motion; one clock and one sky for the whole app. `DESIGN_PLAN.md` §6. |
| Sound | (2026-09-26) Optional natural sounds only (misbaha clicks, birds, breeze, rain), each with its own off switch. No musical tones, chimes or bells. `DESIGN_PLAN.md` §5. |
| Hijri calendar | (2026-09-26) Hijri date on home (Umm al-Qura, ±2-day adjustment) and special-day cards (Friday, الأيام البيض، Ramadan, العشر، عرفة، العيد). `DESIGN_PLAN.md` §8. |
| Book & reciter on home | (2026-09-26) Home rows *show* the chosen book; choosing is in onboarding, Settings and the reader's ☰ — not pickers on the rows. |
| Themes | 5 skies, automatic by time of day: الفجر، الصباح، العصر، المغرب، الليل. User can pin one in settings. |
| Back button | On the **right** (Arabic app convention). |
| Moving between athkar | Tap «٥ / ٢٦» to open a list and jump; vertical swipe as shortcut; player next/previous. |
| Progress reset | Automatic when the collection's time window starts (§5.2). |
| Reading page tabs | Tabs above the card: «ترجمة الذكر» · **«الذكر»** · «فضل الذكر ودليله». Tappable; swipe is a shortcut. |
| Gestures rule | Gestures allowed **only as shortcuts** for something that is also a visible button. |
| Counting | Tap anywhere on the card counts. The circle only *shows* the remaining count. |
| Audio repeat | Toggle «تكرار الأذكار المكررة صوتيًا»: on = recording repeats `num` times; off = plays once, counts once, moves on (thiker stays partially counted). |
| Audio ↔ counter | Each playback counts one repetition. Listening advances the card by itself. |
| Player controls | Repeat toggle and speed (0.75×/1×/1.25×/1.5×) live inside the player. |
| Missing recording in play-all | Player pauses on that card; user counts by tapping; audio resumes on the next card. |
| Books | A "book" = one scholar's selection, order and counts of athkar. User picks the scholar they trust. Default for new users: **Ibn Baz** (shorter, easier). |
| Library & sections | (2026-10-08) Books from Turath: **حصن المسلم**، **تحفة الأخيار** (replaces the old Ibn Baz list)، **مختصر القاسم**. One pool for athkar and one for hadiths; books keep their chapters. Home keeps the four daily wirds and adds «جميع الأذكار» (43 sections in 10 groups, with search) and «المكتبة» (books chapter by chapter). Non-wird sections are reading lists, not counted wirds. Weak narrations are left out for now. Each book keeps its own wording; only harakat differences are merged. Book names show with their author. |
| Reciters | Every recording is one reciter reading one thiker. Reciter list per book is computed from what's recorded. Current reciter: **فارس بن تركي الرشيد**. |
| Scholar wording differences | Merge texts that differ only in diacritics; keep separate texts only when the words differ. |
| Virtue & evidence | Stored on each **book entry** (scholar + collection + thiker), not on the thiker — the same text has different virtues in different contexts (Ayat al-Kursi: morning / after prayer / sleep). |
| Evidence | Written by you in the editor. Grade from a fixed list (صحيح، حسن، ضعيف، موضوع) + optional note (e.g. «صححه الألباني»). |
| Content editor | A local editor on your Mac (`npm run editor`) — for you only. App users can't add athkar (maybe later). |
| Font | One standard Arabic font for all athkar for now. Quranic text later from a Quran text source you choose — fetched once in the editor and saved into content, never at runtime. |
| Prayer times | Computed on the phone with `adhan` + GPS. No API, works offline. |
| Settings | App-wide settings via an icon on the home header. Reading settings via ☰ on the reading page. |
| Data storage | Bundled JSON now. Later: download newer content files when online. No server database. |
| Screen | Kept awake while reading. |
| Translation tab | Hidden until translation data exists. |
| Money | Free, no ads. |

## 3. Screens

### 3.1 Home

Top to bottom:

1. **Header** — logo, settings icon.
2. **Prayer section** — the six times (الفجر، الشروق، الظهر، العصر، المغرب، العشاء), next prayer
   highlighted, live countdown «بقي على العصر ١:٢٣:٤٥». Tapping opens the prayer-times screen.
3. **Suggested athkar** — one large button for the collection that fits now (§5.1). When nothing
   is due, it suggests المسبحة and shows what's next («أذكار النوم بعد ٢:١٠»).
4. **All collections** — full-width rows: أذكار الصباح، أذكار المساء، أذكار بعد الصلاة، أذكار النوم،
   المسبحة. Each athkar row shows:
   - title
   - state: not started / in progress / done for this period (three visually distinct states)
   - an oval «إكمال» pill at the bottom-left when started but not finished
   - an audio button that opens the reading page and starts playing

### 3.2 Reading page (the core screen)

```
┌───────────────────────────────┐
│ ☰                     رجوع ›  │  top bar
│  ترجمة الذكر   الذكر   فضل الذكر │  tabs (center one prominent, sides small/faded)
│ ┌───────────────────────────┐ │
│ │          ٥ / ٢٦           │ │  athkar position in the collection
│ │                           │ │
│ │        thiker text        │ │  scrolls if long; tap anywhere = +1
│ │                           │ │
│ │ ↺          (٣)         🔊 │ │  reset · remaining ring · audio
│ └───────────────────────────┘ │
│ ■  ⏭  ⏯  ⏮  ⟲   ━━━━●━━━━━  │  player (appears when audio starts)
└───────────────────────────────┘
```

- **Top bar:** back button on the right; ☰ on the left opens a sheet with: book (scholar),
  font size, reciter.
- **Moving between athkar:** tapping «٥ / ٢٦» opens a list of the collection's athkar (with
  done/partial marks) to jump to any one. Swiping up/down is a shortcut for next/previous.
- **Tabs:** «الذكر» in the center. Swiping right shows «فضل الذكر ودليله» (virtue + hadith with
  its source). Swiping left shows «ترجمة الذكر» (language picker at top: English / اردو), which
  stays hidden until translations exist.
- **Card:** fills the screen between the top bar and the player area.
  - Top: position in the collection.
  - Bottom center: circular ring around the remaining repetitions, filling as you count.
  - Bottom left: reset this thiker (appears after the first count).
  - Bottom right: audio button. Tapping it opens the player and the button hides.
  - Counting only happens on the «الذكر» tab. A scroll is not a tap.
  - Light haptic per count, stronger haptic when a thiker completes, then auto-advance.
- **Player (bottom):** play/pause in the center, previous/next on each side (RTL: next is on the
  left), stop/close at the far left, one/all toggle at the far right, seek bar underneath.
  Also holds the repeat toggle and speed chip.
- **Completion:** calm screen after the last thiker. Buttons: start over, back to home. No confetti.

### 3.3 المسبحة (tasbih)

Goal: **the most satisfying screen in the app.** The only place with real motion.

- **Phrase picker** at the top: سبحان الله، الحمد لله، الله أكبر، لا إله إلا الله، أستغفر الله،
  سبحان الله وبحمده، لا حول ولا قوة إلا بالله، اللهم صلِّ على محمد — plus a custom phrase.
- **Tap anywhere** on the large area to count. The count is big and centered.
- **Beads:** a string of beads where each tap slides one bead across with a spring motion, like a
  real misbaha. The bead at the target is marked differently.
- **Feel:** light haptic tick on every tap, a distinct stronger haptic at the target; optional
  soft click sound (off by default — people use it in quiet places).
- **Target:** ٣٣ / ٩٩ / ١٠٠ / custom / no limit. At the target: a calm completion moment, then it
  continues into the next round, with rounds shown as «٢ × ٣٣».
- **Reset** button (small, with confirmation once the count is large).
- Count is saved and stays until the user resets it. No streaks, no statistics.
- Phrases live in `content/tasbih.json` so more can be added with content updates.

### 3.4 Prayer times

- Six rows, next prayer highlighted with countdown, current location name.
- Location: GPS by default. If permission is denied → choose a city from a list (stored with
  coordinates, so calculation stays on-device).
- Calculation method: default by country (Umm al-Qura in Saudi Arabia), changeable in settings.

### 3.5 Settings

- Location and calculation method
- Default font size
- Audio: repeat toggle default, speed default
- المسبحة: sound on/off
- Theme: automatic (time of day) or fixed
- Notifications (phase 2)
- Reset all progress (confirmation dialog)
- Contact the developer

## 4. Content data model

> Reworked 2026-10-08 (schema 2): one pool of athkar and one of hadiths; books keep their own chapters
> and order; app sections draw from the chapters mapped to them. Built books and what was left out:
> `content/REPORT-BOOKS.md`.

### 4.1 Files

```
content/
├── manifest.json        contentVersion + schemaVersion, defaultBook, books (library order)
├── athkar.json          every thiker exactly once — the single source of words
├── hadiths.json         every narration once — text, virtue, source, grade (shared by books)
├── sections.json        the app's groups and sections (wirds and reading lists)
├── books/
│   ├── hisn.json        حصن المسلم — القحطاني (built from Turath 31307)
│   ├── baz.json         تحفة الأخيار — ابن باز (Turath 31303)
│   ├── qasim.json       مختصر الأذكار والآداب — القاسم (Turath 576)
│   └── uthaymeen.json   ابن عثيمين — morning, evening (hand-made, no Turath source)
├── sources/turath/      the Turath pages the built books come from (npm run content:fetch)
├── reciters.json · tasbih.json · calendar.json · quran.json
└── audio/<reciter>/<thiker-id>.m4a
```

Built books are regenerated by `npm run content:books` (parse → hisn → baz → qasim, in that order:
baz and qasim reuse حصن المسلم's vocalised text and hadiths). Their recipes are
`scripts/books/<book>.recipe.mjs`; edit the recipe, not the generated JSON.

### 4.2 `athkar.json` — the words only

```json
{ "ayat-al-kursi": { "title": "آية الكرسي", "text": "…", "quran": true, "ayahs": { "sura": 2, "from": 255, "to": 255 } } }
```

- Change a thiker here once and it changes in every book and section that uses it.
- **Same thiker = same letters.** Texts are compared without harakat (alif/ya/ta marbuta unified,
  «ألّا» = «أن لا»); the most fully vocalised wording is kept. Different words, or the same words in
  another order, are a separate thiker (each book keeps its own wording).
- أصبحنا and أمسينا wordings are separate athkar.

### 4.3 `hadiths.json` — the evidence, once

```json
{ "hisn-79": { "fadl": "من قالها موقنًا بها…", "source": "أخرجه البخاري، ٧/ ١٥٠، برقم ٦٣٠٦", "grade": "صحيح", "text": "…" } }
```

- Ids are `<book>-<n>` for the book that brought it; another book citing the same narration points at
  it and may add its own quotation (`text`) if the first had none.
- `grade` is read from the takhrij itself; weak and fabricated grades are rejected by the validator.

### 4.4 `books/<id>.json` — the book as its author ordered it

```json
{
  "title": "حصن المسلم", "author": "سعيد بن وهف القحطاني", "source": { "turath": 31307 },
  "chapters": [
    { "title": "أذكار الصباح والمساء", "sections": ["morning", "evening"], "entries": [
      { "id": "ayat-al-kursi", "hadith": "hisn-75", "note": "يستعيذ بالله من الشيطان الرجيم، ثم يقرأ" },
      { "id": "asbahna-almulk-long", "only": "morning", "hadith": "hisn-77" },
      { "id": "amsayna-almulk-long", "only": "evening", "hadith": "hisn-77" },
      { "id": "subhanallah-wa-bihamdih", "num": 100, "hadith": "hisn-91" }
    ] },
    { "title": "دعاء دخول المسجد", "sections": ["mosque"], "entries": [ { "guide": "…" } ] }
  ]
}
```

- `num` (default 1), `note` (when/how), `fadl` (this book's own wording of the virtue), `only` (one
  of the chapter's sections, for chapters shared by morning and evening).
- `guide` is a line of guidance with no words to say (يبدأ برجله اليمنى). Reading lists only.
- The library shows a book chapter by chapter; a section shows the chapters mapped to it.

### 4.5 `sections.json`

```json
{
  "groups": { "daily": "الأوراد اليومية", "travel": "السفر", "…": "…" },
  "sections": {
    "morning": { "title": "أذكار الصباح", "group": "daily", "kind": "wird", "resetAt": "fajr", "opening": { "…": "…" } },
    "travel":  { "title": "الركوب والسفر", "group": "travel", "kind": "list" }
  }
}
```

- `wird` (الصباح، المساء، بعد الصلاة، النوم): counted, progress saved, resets with its time.
- `list` (everything else): read as a list; tapping a card counts it down, nothing is saved.
- A wird defaults to `manifest.defaultBook` (Ibn Baz); a list to the first book in library order
  (حصن المسلم). The user's choice per section is kept in `settings.bookByCollection`.

### 4.6 `reciters.json`

```json
{
  "faris-alrasheed": {
    "name": "فارس بن تركي الرشيد",
    "recorded": ["ayat-alkursi", "ikhlas", "…"]
  }
}
```

- Audio path is always `audio/<reciter>/<thiker-id>.m4a`. One file = one repetition.
- Reciter list for a book = reciters with at least one recording in that book's list. Partial
  coverage is shown as «جزئي ١٥/١٩».
- Adding a reciter = one entry + one folder. Nothing else changes.
- Metro can't `require()` dynamic paths, so the build step generates `audio-index.ts` with one
  static `require` per file. Downloaded content (later) uses file URIs instead.

### 4.7 Rules (enforced by `npm run content:validate`)

- Ids are lowercase-kebab and **never renamed** — saved progress points to them.
- Every book entry id exists in `athkar.json`, every `hadith` in `hadiths.json`, every chapter section in `sections.json`. `num` is a whole number > 1 (left out for once).
- A hadith needs a source; «ضعيف» and «موضوع» are rejected. A wird holds no guides.
- Every `recorded` id exists, and its audio file exists. No orphan audio files.
- Athkar or hadiths not used by any book → warning. The same thiker twice with the same count in one wird → warning.
- No presentation data in content (no colors).

## 5. Behaviour rules

### 5.1 Suggested athkar (first match wins)

| Window | Suggestion |
|---|---|
| Any prayer → +30 min | أذكار بعد الصلاة |
| Fajr → Dhuhr | أذكار الصباح |
| Dhuhr → Asr | أذكار الصباح if unfinished, otherwise المسبحة |
| Asr → Isha + 35 min | أذكار المساء |
| Isha + 35 min → Fajr | أذكار النوم |

**Dead times:** whenever the fitting collection is already done for this period, suggest
**المسبحة** instead, with the next collection's time underneath.

### 5.2 Progress and automatic reset

Each collection's progress carries a **period key** saying which period it belongs to:

| Collection | New period starts at | Example key |
|---|---|---|
| Morning | Fajr | `2026-09-24` |
| Evening | Asr | `2026-09-24` |
| Sleep | Isha | `2026-09-24` (still valid after midnight until next Isha) |
| Post-prayer | each prayer | `2026-09-24-asr` |

On read, if the stored key ≠ current key, the progress counts as empty. No timers, no background
work. Progress is kept **per collection per book**, so switching scholar doesn't erase the other.

```ts
progress[collectionId][bookId] = { periodKey, index, counts: { [thikerId]: number } }
```

### 5.3 Audio

- Play one / play all (toggle). Repeat on: replay until `num` is reached, counting each playback.
  Repeat off: play once, count once, move on — the thiker stays partially counted.
- Background playback with lock-screen controls (verify `expo-audio` support at build time).
- Stop closes the player; the audio button returns to the card.

### 5.4 Prayer times

- `adhan` computes times from stored coordinates each day. No network needed.
- Umm al-Qura: add +30 min to Isha during Ramadan (adhan's documented adjustment).
- Location re-read on app open when permission is granted; stored coordinates otherwise.

### 5.5 Notifications (phase 2)

- Local only (`expo-notifications`), no server.
- Types: each prayer (toggle per prayer), morning reminder (after Fajr), evening reminder (after
  Asr), sleep reminder (after Isha). Times adjustable.
- **iOS allows 64 pending local notifications.** Schedule a rolling 7 days
  (5 prayers × 7 + 3 reminders × 7 = 56), refreshed on every app open and when location changes.
- Permission: an explanation screen first, then the system prompt — only when the user turns a
  notification on.

## 6. App architecture

- Expo SDK 57, TypeScript, `expo-router`. Install every package with `npx expo install`.
- Packages: `expo-router`, `expo-audio`, `expo-font`, `expo-haptics`, `expo-keep-awake`,
  `expo-location`, `expo-notifications`, `@react-native-async-storage/async-storage`,
  `zustand`, `adhan`, `react-native-reanimated`. Added by `DESIGN_PLAN.md` §11 D0:
  `@shopify/react-native-skia`, `react-native-gesture-handler`, `expo-device`, `expo-splash-screen`.

```
app/
├── _layout.tsx
├── index.tsx                home
├── read/[collection].tsx    reading page
├── tasbih.tsx               المسبحة
├── prayer.tsx               prayer times + location
└── settings.tsx
content/                     data (§4)
lib/                         pure logic, unit-tested
├── content.ts               getCollection(collection, book), getReciters(...), getAudio(...)
├── suggestion.ts            §5.1
├── period.ts                §5.2 period keys
├── prayer.ts                adhan wrapper, next prayer, countdown
└── arabic.ts                toArabicDigits, splitBasmalah
store/
├── settings.ts              zustand + persist
├── progress.ts              zustand + persist
└── tasbih.ts                zustand + persist
```

- **State:** Zustand with `persist` to AsyncStorage, with a `version` and `migrate` function from
  day one. One source of truth; screens read through selectors. This fixes the old app's worst bug
  class (progress copied into three places and drifting).
- **RTL:** hard-coded direction (`row-reverse`, `textAlign: 'right'`), no `I18nManager`.
- **Tests:** unit tests for `lib/` (suggestion windows, period keys around midnight/Fajr,
  content resolution) + the content validator.

## 7. Phases

### Phase 0 — Content conversion + editor ✅ (branch `feat/content-model`, web app untouched)

| Command | What it does |
|---|---|
| `npm run editor` | Opens the editor at http://localhost:4321 |
| `npm run content:validate` | Checks `content/` (the editor also checks on every save) |
| `npm run content:quran` | Fills Quranic athkar from the KFGQPC Hafs V30 text (added 2026-09-26) |

**Editor** (`scripts/editor/`): search/create/edit/delete athkar; per-entry count, virtue and
evidence; copy virtue+evidence to the thiker's other entries; upload/replace/delete recordings;
books: reorder, add/remove athkar, add collections, add books, choose the default book.
Every save is validated and bumps `contentVersion`. Quranic text is read-only there.
Since schema 2 (2026-10-19): hand-made books (no Turath `source`) are edited chapter by chapter —
sections per chapter, count, `only`, note, virtue, guides, and the hadith an entry points at (new
hadiths are owned by that book, `<book>-<n>`). Books built from Turath are shown read-only: change
their recipe and run `npm run content:books`.

**Conversion** — one-time script, now `history/scripts/convert-content.mjs` (it ran once; not meant to run again):

1. Read `Morning_pool.json`, `Evening_pool.json`, `sheikh_configs.json`, `post-prayer.json`, `sleep.json`.
2. Merge identical texts (compared without diacritics). Near-identical texts that differ only in
   diacritics are merged, keeping Ibn Uthaymeen's version. Every merge is listed in a report.
3. Assign readable ids from a hand-written map (~40 entries).
4. Move `num` into book entries. Build `uthaymeen.json`, `baz.json`, `general.json`.
5. Copy recordings to `audio/faris-alrasheed/<id>.m4a`. Merged athkar share their recording,
   which restores audio for الهم والحزن (morning), tahleel (Ibn Baz), evening سيد الاستغفار,
   and others.
6. Drop `textColor`, drop empty `fadhel`, move title prefixes like «آية الكرسي:» into `title`,
   remove the dangling `e_020`.
7. Run the validator and write `content/REPORT.md`: merges, athkar without audio, athkar without fadl.

**Done when:** validator passes and you've reviewed the report. ✅ Validator passes; report is in
`content/REPORT.md`.

### Phase 1 — Core app (internal testing) — in progress

**Status (2026-09-24):** app in `mobile/` (Expo SDK 57). Built: home, reading page (tabs, tap
anywhere to count, ring, reset, list sheet, ☰ menu with book / font size / reciter, virtue +
evidence tab, completion), audio player (one/all, repeat, speed, seek, lock-screen metadata),
المسبحة (spring-animated beads, targets, custom phrase), prayer times (on-device `adhan`, GPS or
city, method picker), settings, automatic time-of-day themes, a device test screen (`/lab`).
Logic in `mobile/src/lib` is unit-tested (`npm test`). Verified in the web build; **native builds
need Xcode 26.4+** (SDK 57 requirement).

Commands (in `mobile/`): `npm run ios` / `npm run android` (dev build), `npx expo start` (Expo Go),
`npm run web`, `npm test`, `npm run typecheck`, `npm run lint`.

**Status (2026-09-26):** the design plan is built (`DESIGN_PLAN.md` §11, D0–D6, branch
`feat/design-system`): one clock and one Skia sky for the whole app, quality tiers, the new reader
(journey sky, counting feel, completion, opening and ending moments, KFGQPC Quran text), the living
sky, home with the day/night arc, Hijri date and special days, onboarding, the rebuilt misbaha,
sound engine, full settings, and local reminders. Verified in the web build; still to check on
real phones (release builds) — see `DESIGN_PLAN.md` §15.

**Start with a 1–2 day test app** before building screens: the longest thiker in the chosen Arabic
font with full tashkeel on a real iPhone **and** Android phone, one recording playing with the
screen locked, and one scheduled notification. If all three work, continue.

Then: scaffold, content layer, home, reading page («الذكر» + «فضل الذكر ودليله»), counter, progress
with automatic reset, full audio player (one/all, repeat, speed, background), book and reciter
picker, المسبحة, on-device prayer times + location, settings, font size, keep-awake, haptics,
themes.

**Done when:** you use it daily on your own phone through TestFlight / Play internal testing for a week
without losing progress.

### Phase 2 — Notifications + store release (v1.0)

Notification settings and scheduling, permission flow, app icon, splash screen, Arabic store
listing and screenshots, privacy policy, release.

**Status (2026-09-26):** ✅ notifications — local only, rolling 7 days (≤ 60 pending, under iOS's
64), rebuilt on open and when reminders or the location change; per-prayer toggles and morning /
evening / sleep reminders; permission asked only when the first reminder is turned on; tapping a
reminder opens its collection (`mobile/src/lib/notify.ts`, `app/notifications.tsx`). ✅ splash —
your logo on the night sky. Still to do: a real **app icon** (the current one is Expo's
placeholder), store listing and screenshots, privacy policy, release.

**Done when:** live on the App Store and Google Play.

### Phase 3 — Later updates

- Online content updates (download newer content files when connected; same JSON format)
- Translation tab (English, Urdu)
- Sunnah tracker + time-based sunnah suggestions (a checklist, no streaks or scores)
- Home-screen widget (next prayer + suggested athkar; needs native code)
- More collections (waking up, entering home, travel, …)
- More reciters
- **Web Push for the web app (on hold, 2026-10-19).** The web app (PWA) can only show reminders
  while it's open or was recently in the background (`mobile/src/lib/notify.web.ts`: timers and the
  service worker). A browser can't schedule a notification for later, so reaching a fully closed
  PWA needs a push server. That breaks the "no server" rule in §5.5, so it waits until you decide
  it's worth it. Suggested design if it goes ahead:
  - VAPID keys. After permission, `notify.web.ts` subscribes with `PushManager` and sends the
    subscription plus the reminder times from `lib/reminders.ts` (time, title, url) to a Vercel
    function. Turning every reminder off deletes the record on the server.
  - Storage: Upstash Redis (free tier, from the Vercel Marketplace), with a sorted set of due times.
    Store only the subscription and the times: no location, no account.
  - Sender: something calls `/api/push/tick` every minute and it sends what's due with `web-push`.
    Vercel Hobby cron runs only once a day, so use Upstash QStash (signed calls), cron-job.org, or
    Vercel Pro.
  - Store about 30 days of times. If the app isn't opened in that window, pushes stop until it's
    opened again.
  - Add a `push` handler to the service worker (`scripts/gen-sw.mjs`); the `notificationclick`
    handler already opens the right screen.
  - iPhone: only a home-screen app gets push (iOS 16.4+). The privacy policy (§8) would have to say
    that reminder times are sent to the server.
  - Done when a reminder arrives on a closed installed PWA on Android Chrome and on iPhone, and
    turning reminders off removes the server schedule.

## 8. Release checklist

- Apple Developer Program (99 USD / year) and Google Play Console (25 USD once)
- EAS Build + EAS Submit
- Privacy policy page: location is used on the device only, nothing is collected or sent.
  Both stores require one even for free apps.
- Arabic location-permission explanation text
- Bundle id (e.g. `com.<you>.athkarna`), app icon, splash, store screenshots

## 9. Content work (yours, not code)

All in the editor; `content/REPORT.md` has the full lists.

- **Listen to 8 shared recordings** — each is attached to two athkar with different words (mostly
  أصبحنا/أمسينا pairs), so one of each pair plays the wrong words. Re-record or re-assign.
- **Decide 4 near-duplicates** (e.g. two wordings of سيد الاستغفار) — keep one wording or both.
- **Record 16 entries with no audio** (evening أمسينا وأمسى الملك لله، Ibn Baz's فطرة الإسلام /
  عافني في بدني / الكفر والفقر، most post-prayer and two sleep athkar). For the evening أمسينا, an
  old recording exists: `voices/012E.m4a` (the conversion missed it) — it covers the first part
  of the text; listen and attach it if it fits (`history/README.md`).
- **Write virtue + evidence** for each entry (35 entries have no virtue yet; none has evidence).
- Add back whichever thiker `e_020` was meant to be.
- ✅ Quran text source: KFGQPC Hafs V30 (`content/sources/`, `npm run content:quran`).
- **Record the misbaha** — `DESIGN_PLAN.md` §12. The clicks in the app now are synthesized placeholders.
- **Ambient loops** (CC0 recordings: fajr birds, night crickets, rain) — `DESIGN_PLAN.md` §5.
- **Approve the texts** of the opening verses, ending lines and special days (`DESIGN_PLAN.md` §8, §12).
- Translations (Phase 3).

## 10. Open questions

Design questions are listed in `DESIGN_PLAN.md` §13.
