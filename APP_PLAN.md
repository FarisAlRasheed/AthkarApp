# أذكارنا — Complete App Plan (Expo rebuild)

> Last updated 2026-09-24. Self-contained: can be pasted into a new chat as full context.
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
| Animations | None, **except المسبحة**, where motion is the point. |
| Themes | Colors change automatically with the time of day. Reduced from the web app's 9 to **5**: الفجر، الصباح، العصر، المغرب، الليل. User can pin one in settings. |
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

### 4.1 Files

```
content/
├── manifest.json        contentVersion + schemaVersion (for future online updates)
├── athkar.json          every thiker exactly once — the single pool
├── collections.json     the four collections
├── books/
│   ├── uthaymeen.json   الشيخ ابن عثيمين — morning, evening
│   ├── baz.json         الشيخ ابن باز — morning, evening
│   └── general.json     post-prayer, sleep (single book → picker hidden)
├── reciters.json        who recorded what
├── tasbih.json          المسبحة phrases + default targets
└── audio/
    └── faris-alrasheed/<thiker-id>.m4a
```

### 4.2 `athkar.json` — the words only (no count, no virtue, no audio)

```json
{
  "ayat-al-kursi": {
    "title": "آية الكرسي",
    "text": "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ …",
    "quran": true,
    "translations": { "en": "…", "ur": "…" }
  }
}
```

- `title` — short name for the player, lists and notifications.
- `quran` — Quranic text (green tint now; Quran font later). Replaces guessing with `isQuranicText`.
- `translations` — optional, Phase 3.
- أصبحنا and أمسينا versions are **separate athkar** (different text, different recording).

### 4.3 `books/<id>.json` — the scholar's order, counts, virtues and evidence

```json
{
  "name": "الشيخ ابن باز",
  "collections": {
    "morning": [
      {
        "id": "ayat-al-kursi",
        "num": 1,
        "fadl": "تحمي من الشيطان حتى يمسي",
        "evidence": { "text": "…", "source": "…", "grade": "صحيح", "gradeNote": "…" }
      },
      { "id": "tahleel", "num": 10 },
      { "id": "tahleel", "num": 100 }
    ]
  }
}
```

- `num`, `fadl` and `evidence` live on the entry because they depend on context: the same thiker
  can appear with different counts (Ibn Baz lists the tahleel ×10 **and** ×100 — two hadiths) and
  different virtues (Ayat al-Kursi in the morning vs. after prayer vs. before sleep).
- `fadl` and `evidence` are optional. The editor can copy them from one entry to the others.

### 4.4 `collections.json`

```json
{
  "morning":     { "title": "أذكار الصباح",     "resetAt": "fajr" },
  "evening":     { "title": "أذكار المساء",     "resetAt": "asr" },
  "post-prayer": { "title": "أذكار بعد الصلاة", "resetAt": "each-prayer" },
  "sleep":       { "title": "أذكار النوم",      "resetAt": "isha" }
}
```

### 4.5 `reciters.json`

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

### 4.6 Rules (enforced by a validator script)

- Ids are lowercase-kebab and **never renamed** — saved progress points to them.
- Every book entry id exists in `athkar.json`. `num` is an integer ≥ 1.
- Every `recorded` id exists, and its audio file exists. No orphan audio files.
- Athkar not used by any book → warning.
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
  `zustand`, `adhan`, `react-native-reanimated` (المسبحة only).

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
| `npm run content:convert` | The one-time conversion. Refuses to overwrite `content/` without `--force` |

**Editor** (`scripts/editor/`): search/create/edit/delete athkar; per-entry count, virtue and
evidence; copy virtue+evidence to the thiker's other entries; upload/replace/delete recordings;
books: reorder, add/remove athkar, add collections, add books, choose the default book.
Every save is validated and bumps `contentVersion`.

**Conversion** — one-time script `scripts/convert-content.mjs`:

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

**Done when:** live on the App Store and Google Play.

### Phase 3 — Later updates

- Online content updates (download newer content files when connected; same JSON format)
- Translation tab (English, Urdu)
- Sunnah tracker + time-based sunnah suggestions (a checklist, no streaks or scores)
- Home-screen widget (next prayer + suggested athkar; needs native code)
- More collections (waking up, entering home, travel, …)
- More reciters

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
  عافني في بدني / الكفر والفقر، most post-prayer and two sleep athkar).
- **Write virtue + evidence** for each entry (35 entries have no virtue yet; none has evidence).
- Add back whichever thiker `e_020` was meant to be.
- Choose a Quran text source for Quranic athkar.
- Translations (Phase 3).

## 10. Open questions

None right now.
