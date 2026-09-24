# Design Prompt — أذكارنا (Expo / React Native)

> Paste everything below the line into Claude Design. It is self-contained.
> Matches `APP_PLAN.md` (2026-09-24).

---

Design the screens for **أذكارنا (Athkarna)**, an Arabic-only Islamic remembrance (athkar) mobile
app built in Expo / React Native for iOS and Android. I need mockups I can hand to a developer
(me) and build in React Native — not marketing art.

## 1. Product in one paragraph

The user opens the app, sees today's prayer times with a countdown to the next one, and one big
suggestion for what to read right now (e.g. أذكار المساء after Asr). They tap in and read one thiker
at a time, tapping anywhere on the card to count repetitions (3×, 33×, 100×); when the count is
reached the app moves to the next thiker. Each thiker can be listened to — the audio player can
play one thiker or the whole collection, and each playback counts one repetition. Users choose the
scholar whose selection of athkar they follow (ابن باز، ابن عثيمين). There is also a digital
tasbih (المسبحة). Free, no ads, no account.

## 2. Hard constraints

- **Arabic only, RTL only.** All UI copy is Arabic. Numbers in Arabic-Indic digits (٣، ٣٣، ١٠٠),
  clock times LTR-formatted inside the RTL layout (e.g. `٤:٣٣ ص`).
- **Two type roles:** athkar text uses one readable Arabic text face (naskh style) that renders
  full tashkeel well — propose one, with generous line-height (~1.9–2.1); all UI chrome uses a clean
  modern Arabic UI face. (A dedicated Quran font may come later for Quranic verses only.) Athkar
  text is the hero and can run long (6–10 lines).
- **Gestures only as shortcuts.** Every action must have a visible, tappable control. Swipes may
  exist as shortcuts for those controls, never as the only way.
- **No animations, except المسبحة**, where motion is the point (§4.D).
- **Phone-first**, 390×844. Respect safe areas. Primary actions in the bottom two-thirds.
- **Native feel** — standard iOS/Android sheets, lists and conventions.
- Back button sits on the **right** (Arabic convention).

## 3. Visual direction

Calm, reverent, uncluttered. Generous whitespace, soft rounded cards (16–24px radius), soft
shadows, no harsh borders. A quiet moment, not a productivity dashboard. Avoid clip-art mosques,
crescents, and gold gradients.

**Time-of-day theming is the app's signature.** The whole app recolors automatically through the
day, with **5 themes**. Starting colors — improve them freely:

| Theme | When | Base | Accent |
|---|---|---|---|
| الفجر (dark) | Fajr → sunrise | `#1a3a5c` | `#6a9fd8` |
| الصباح (light, warm) | sunrise → Asr | `#f7dfc8` | warm amber |
| العصر (golden) | Asr → Maghrib | `#c4a882` | `#b88a50` |
| المغرب (dark, sunset) | Maghrib → Isha | `#3a2a5a` | `#d4885a` |
| الليل (darkest) | Isha → Fajr | `#0a0a1a` | `#7b8dd4` |

Quranic text inside a thiker is tinted green (`#7ecba1` on dark themes) to set revealed text apart
from supplication — make this work on light themes too.

Show every screen in **at least one light and one dark theme**.

## 4. Screens

### A. Home — light + dark

Top to bottom:

1. **Header:** logo (right), settings icon (left).
2. **Prayer section:** countdown «بقي على العصر» above a large `١:٢٣:٤٥`; six compact cells —
   الفجر، الشروق، الظهر، العصر، المغرب، العشاء — with the next prayer marked. Tappable (opens C).
3. **Suggestion:** one large button for what fits now, labeled as a suggestion. Design 3 states:
   - an athkar collection (e.g. أذكار المساء), with «إكمال» if already started
   - done for now → suggests **المسبحة**, with the next collection's time («أذكار النوم بعد ٢:١٠»)
   - post-prayer (أذكار بعد الصلاة) right after a prayer
4. **All collections** as **full-width rows**: أذكار الصباح، أذكار المساء، أذكار بعد الصلاة،
   أذكار النوم، المسبحة. Each athkar row has:
   - title
   - three clearly different states: untouched / in progress / done for this period — show all three
   - an oval «إكمال» pill at the bottom-left when in progress
   - a small play button that opens the collection and starts audio

### B. Reading page — the core screen

Layout, top to bottom:

- **Top bar:** back (right), ☰ (left).
- **Tabs** above the card: «ترجمة الذكر» (left, small, faded) · **«الذكر»** (center, prominent) ·
  «فضل الذكر ودليله» (right, small, faded). Tapping switches; swiping is a shortcut.
- **Card** filling the space between the top bar and the player area:
  - top: position «٥ / ٢٦» — tappable, opens the athkar list (frame 6)
  - center: thiker text; tapping **anywhere** on the card counts one
  - bottom center: circular ring around the remaining repetitions, filling as you count
    (display only — the whole card is the tap target)
  - bottom left: reset-this-thiker button, appears after the first count
  - bottom right: audio button; when tapped, the player appears and the button hides
- **Player** (bottom, only when audio is active): play/pause center; previous/next either side
  (RTL: next is on the left); stop/close far left; one/all toggle far right; seek bar underneath.
  It also holds a speed chip (0.75× / 1× / 1.25× / 1.5×) and a toggle
  «تكرار الأذكار المكررة صوتيًا» — you decide their placement.

Frames:

1. **Default** — no audio, count untouched
2. **Mid-count** — ring partly filled, reset button visible
3. **Long text** — text scrolls; counter and controls stay fixed
4. **فضل الذكر ودليله tab** — virtue text, then the hadith with its source and grading
5. **Audio playing** — player visible, audio button hidden; include the play-all state
6. **Athkar list** (sheet from «٥ / ٢٦») — every thiker in the collection with done / partial /
   untouched marks; tap to jump
7. **☰ sheet** — choose book (scholar), font size, reciter (reciters that only recorded part of the
   book show «جزئي ١٥/١٩»)
8. **Collection complete** — calm, with «ابدأ من جديد» and «العودة للرئيسية». No confetti.
9. **Large-text variant** — show how the layout degrades
10. **ترجمة الذكر tab** (future) — language picker at the top (English / اردو), translation below.
    This is the only place non-Arabic text appears.

### C. Prayer times

- Current location name, six prayer rows, next prayer highlighted with its countdown.
- Times are calculated on the phone (no network). Design:
  - **location permission explanation** before the system prompt
  - **permission denied** → pick a city from a list (bottom sheet with search)
- Calculation method row (e.g. أم القرى) opening a picker.

### D. المسبحة — make this the most satisfying screen in the app

This is the one place where motion is welcome. Think of the feel of real beads.

- **Phrase picker** at top: سبحان الله، الحمد لله، الله أكبر، لا إله إلا الله، أستغفر الله،
  سبحان الله وبحمده، لا حول ولا قوة إلا بالله، اللهم صلِّ على محمد، + custom.
- **Huge tap area.** The count is large and centered.
- **Beads:** a string of beads; each tap slides one bead across with a spring. The bead marking the
  target looks different. Describe the motion (timing, easing, spring) so I can build it with
  Reanimated.
- **Target:** ٣٣ / ٩٩ / ١٠٠ / custom / no limit. Reaching it: a calm completion moment, then the next
  round begins; rounds shown as «٢ × ٣٣».
- Small reset (confirmation when the count is large).
- Specify the haptic per tap and at the target, and an optional soft click sound (off by default).
- Frames: idle, mid-count, target reached, phrase picker open.

### E. Settings

- Location and calculation method
- Default font size
- Audio defaults: repeat toggle, speed
- المسبحة sound on/off
- Theme: automatic (time of day) or pin one of the 5
- Notifications: per-prayer reminders, morning / evening / sleep athkar reminders
- Reset all progress (destructive, confirmation dialog)
- «تواصل مع المطور»
- **Notification permission explanation** screen shown before the system prompt

## 5. Components

A component sheet with states (default / pressed / disabled / complete) for: count ring, collection
row (3 progress states + «إكمال» pill), suggestion card, prayer cell, tab bar above the card, audio
player, primary button, icon button, bottom sheet, toggle row, destructive confirm dialog, tasbih bead.

## 6. Accessibility

- Minimum tap target 44×44
- Arabic body text ≥ 18pt; athkar text comfortable at arm's length — users may be older
- Check contrast on dark themes (the old app's faint low-opacity text was a problem)

## 7. Deliverables

- Artboards at 390×844, grouped by screen, each state its own frame
- Color/type token sheet for the 5 themes, named so it maps directly to a React Native theme object
- Spacing and radius scales as numbers
- Motion spec for المسبحة
- Short notes on anything you changed and why

## 8. Please don't

- Don't add English anywhere except the translation tab content
- Don't design a bottom tab bar unless you argue for it
- Don't rely on hover states
- Don't add animations outside المسبحة, or gesture-only interactions
- Don't add features I didn't list — no login, no social, no streaks, scores or statistics.
  This is worship, not a habit app.
