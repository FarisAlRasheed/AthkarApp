# أذكارنا

An Arabic athkar app: prayer times, the athkar that fit the moment, read and counted one at a
time on a sky that follows the day, with recitations and a misbaha. Free, no ads, no account,
works offline. Expo / React Native for iOS and Android.

| Doc | What's in it |
|---|---|
| [`APP_PLAN.md`](APP_PLAN.md) | What the app does: screens, content model, behaviour rules, phases |
| [`DESIGN_PLAN.md`](DESIGN_PLAN.md) | How it looks, moves, sounds and performs |
| [`content/REPORT.md`](content/REPORT.md) | Content work still to do (recordings, wordings) |
| [`history/README.md`](history/README.md) | Old files, and what happens to the legacy web app |

## Layout

```
mobile/     the Expo app (src/app = screens, src/lib = pure logic with tests)
content/    athkar, books, collections, calendar, tasbih, audio — shared by the app and the editor
            sources/KFGQPC-Hafs-V30.docx — the Quran text the app's Quranic athkar come from
scripts/    content validator, Quran text import, local content editor
history/    old files kept for reference
index.html, script.js, …, data/, images/, voices/
            the legacy web app — still live on GitHub Pages until the app ships
```

## Commands

At the repo root:

| Command | What it does |
|---|---|
| `npm run editor` | Content editor at http://localhost:4321 (athkar, books, virtues, recordings) |
| `npm run content:validate` | Checks `content/` (the editor also checks on every save) |
| `npm run content:quran` | Fills Quranic athkar and opening verses from the King Fahd Complex Hafs V30 text |

In `mobile/`:

| Command | What it does |
|---|---|
| `npm run web` | Runs the app in a browser (quickest way to try changes) |
| `npx expo start` | Expo Go / dev server |
| `npm run ios` / `npm run android` | Development builds (native builds need Xcode 26.4+) |
| `npm test` · `npm run typecheck` · `npm run lint` | Unit tests for `src/lib`, types, lint |

Before the first native build, allow Skia's install script (it downloads Skia's native libraries):
`npm approve-scripts @shopify/react-native-skia && npm rebuild @shopify/react-native-skia` in `mobile/`.
Expo Go and the web build don't need it.

## Web deployment (Vercel)

The app also runs as a website. `mobile/vercel.json` holds the settings:
`npm run build:web` (generates the indexes, copies Skia's `canvaskit.wasm` into `public/`, runs
`expo export -p web` into `dist/`), and every path rewrites to `/` because Expo Router's web
output here is a single-page app.

- **From the dashboard:** vercel.com → Add New → Project → import `FarisAlRasheed/AthkarApp` →
  set **Root Directory** to `mobile` and keep «Include files outside the root directory» on
  (the app reads `../content`) → Deploy. Each push to the chosen branch redeploys; pull requests
  get preview links.
- **From the CLI:** `npm i -g vercel`, then in `mobile/`: `vercel` (preview) or `vercel --prod`.
- **Try the production build locally:** `npm run build:web && npx expo serve` in `mobile/`.

The web build has no haptics, local notifications or lock-screen audio controls; everything else
works.

## Adding things

- **A thiker, a book, a recording** — the editor (`npm run editor`).
- **A Quranic thiker** — give it `quran: true` and `ayahs: { sura, from, to }` in the editor's JSON,
  then `npm run content:quran`. Quranic text is never typed by hand.
- **Misbaha and ambient sounds** — drop files into `mobile/assets/sounds/beads|count|ambient/` and
  run `node scripts/gen-sound-index.mjs` in `mobile/` (see that script for file names). The bead
  clicks there now are synthesized placeholders until real recordings replace them.
- **A special day's text** — `content/calendar.json`.
