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
firstTest/
├── index.html          ← main page
├── styles.css          ← all styling + themes
├── script.js           ← all logic
├── data/               ← athkar JSON files (add more here!)
│   ├── morning.json    ← أذكار الصباح
│   └── evening.json    ← أذكار المساء
├── images/             ← background images
│   └── night-sky.svg   ← night sky for evening theme
└── fonts/              ← put custom Arabic fonts here (.woff2)
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

### 4. Change the Night Sky Image
Replace `images/night-sky.svg` with any image (SVG, PNG, JPG). Update the path in `styles.css`:
```css
.night-bg{
  background: url('images/your-new-image.jpg') center/cover no-repeat;
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
