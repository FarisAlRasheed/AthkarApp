# تطبيق الأذكار — Athkar App

## How to Run
Open `index.html` in a browser. **Must be served from a local server** (not `file://`) because it uses `fetch()` to load JSON.

```bash
# Quick local server:
python3 -m http.server 8000
# Then open http://localhost:8000
```

---

## Project Structure

```
AthkarApp/
├── index.html          ← main page
├── styles.css          ← all styling + themes
├── script.js           ← core app logic
├── main-menu.js        ← main menu page structure & rendering
├── data/               ← athkar JSON files
│   ├── morning.json    ← أذكار الصباح
│   ├── evening.json    ← أذكار المساء
│   ├── sleep.json      ← أذكار النوم
│   └── post-prayer.json ← أذكار بعد الصلاة
├── images/             ← background images and logo
│   ├── bg-day.png      ← background for daytime
│   ├── bg-night.png    ← background for nighttime
│   └── logo.png        ← app logo
└── voices/             ← voice recordings (.m4a)
```

---

## How to Modify

### 1. Edit Existing Athkar
Open any JSON file in `/data` (e.g., `morning.json`). Each thiker is an object:

```json
{
  "text": "نص الذكر",          // ← the thiker text shown on the front face
  "num": 3,                    // ← how many times to repeat (counter max)
  "fadhel": "فضل الذكر"       // ← OPTIONAL: text on the back face (flip to see)
}
```

- If `fadhel` is **omitted**, the card **cannot be flipped** (no back face).
- You can add or remove items from the `"athkar"` array.

### 2. Add a New Athkar Collection
1. Create a new `.json` file in `/data` (e.g., `sleep.json`):
   ```json
   {
     "title": "أذكار النوم",
     "theme": "evening",
     "athkar": [
       { "text": "باسمك اللهم أموت وأحيا", "num": 1 },
       { "text": "سبحان الله", "num": 33, "fadhel": "التسبيح قبل النوم" }
     ]
   }
   ```
2. Open `script.js` and add the filename to the `ATHKAR_FILES` array:
   ```js
   const ATHKAR_FILES = [
     'morning.json',
     'evening.json',
     'sleep.json'    // ← add new file here
   ];
   ```
3. The new collection will appear in the dropdown menu automatically.

### 3. JSON File Fields

| Field     | Required | Description |
|-----------|----------|-------------|
| `title`   | ✅       | Title shown in dropdown and top bar |
| `theme`   | ✅       | `"morning"` (blue sky + clouds) or `"evening"` (night sky + stars) |
| `athkar`  | ✅       | Array of thiker objects |

Each thiker object:

| Field    | Required | Description |
|----------|----------|-------------|
| `text`   | ✅       | The thiker / dua text (front face) |
| `num`    | ✅       | Number of repetitions (counter limit) |
| `fadhel` | ❌       | Virtue text (back face). If omitted, card won't flip |

### 4. Change the Background Images
Replace `images/bg-day.png` or `images/bg-night.png` with any image. Update the paths in `styles.css` if necessary:
```css
.daytime-bg {
  background-image: url('images/bg-day.png');
}
.nighttime-bg {
  background-image: url('images/bg-night.png');
}
```

### 5. Add Custom Fonts
1. Put your `.woff2` font file in `/fonts`
2. Add to `styles.css`:
   ```css
   @font-face {
     font-family: 'MyArabicFont';
     src: url('fonts/my-font.woff2') format('woff2');
     font-weight: normal;
   }
   html, body {
     font-family: 'MyArabicFont', 'Segoe UI', sans-serif;
   }
   ```

### 6. Default Collection Logic
- **3:00 AM – 2:59 PM** → first collection with `"theme": "morning"` is selected
- **3:00 PM – 2:59 AM** → first collection with `"theme": "evening"` is selected
- User's last selection is remembered in localStorage

---

## Interactions
- **Tap card** → increment counter
- **Swipe left/right** → flip card (only if it has a `fadhel`)
- **Swipe up/down** → navigate between cards
- **Arrow keys** → same as swipe (for desktop)
- Counter reaching max → **auto-advances** to next card
- All cards done → shows a completion message

## Themes
- **Morning** (`theme: "morning"`): gradient blue sky + animated clouds
- **Evening** (`theme: "evening"`): starry night sky with moon + subtle parallax on swipe

---

### Adding Voice / Audio to Cards

You can attach audio files to a collection (collection-level prefix) or to individual cards.

- **Place audio files** in the `voices/` folder (or subfolders) in the project root.
- **Collection-level field**: add `voiceDir` to the top-level JSON object to set a folder prefix for card audio files, for example: `"voiceDir": "voices/evening/"`.
- **Card-level field**: add `voice` to a thiker object. Accepted values:
  - a single filename string: `"voice": "duaa1.mp3"` (combined with `voiceDir` if present)
  - a path string: `"voice": "voices/custom/duaa1.mp3"` (used as-is)
  - an array of filenames: `"voice": ["a.mp3", "b.mp3"]` (the app may play the first or choose randomly depending on implementation)

Examples:

Collection with `voiceDir` and cards using filenames:
```json
{
  "title": "أذكار المساء",
  "theme": "evening",
  "voiceDir": "voices/evening/",
  "athkar": [
    { "text": "اللهم بك أصبحنا", "num": 1, "voice": "duaa1.mp3" },
    { "text": "سبحان الله", "num": 33, "voice": ["subhan1.mp3","subhan2.mp3"] }
  ]
}
```

Single card with a full path:
```json
{ "text": "باسمك اللهم أموت وأحيا", "num": 1, "voice": "voices/sleep/bismillah.mp3" }
```

Notes:
- Supported formats: `mp3`, `wav`, `ogg`.
- When `voice` is a filename (not a path) the app will combine `voiceDir` + `voice` if `voiceDir` exists. If `voice` already contains a path it will be used directly.
- The UI displays a play button on cards that include a `voice` field. Auto-play behaviour (on tap or on load) depends on the app logic in `script.js` and browser autoplay policies — update `script.js` if you want custom autoplay behaviour.

If you want, I can also update `script.js` to demonstrate how the app loads and plays `voice` files (play button, preload, and fallbacks). Let me know if you'd like that change.
