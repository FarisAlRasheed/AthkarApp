# history/

Old files kept for reference. Nothing here is used by the app, the editor or the scripts.

| Path | What it is |
|---|---|
| `docs/WEB_APP_README.md` | The web app's README (how its JSON, voices and themes worked). |
| `docs/DESIGN_PROMPT.md` | The first design brief for the Expo app (2026-09-24). Superseded by `DESIGN_PLAN.md`. |
| `docs/SNAPSHOT_2026-02-08.md` | A saved snapshot of the earliest web app (`index.html`, `styles.css`, `script.js`). |
| `scripts/convert-content.mjs` | The one-time conversion (2026-09-24) of the web app's `data/` into `content/`. Its report is `content/REPORT.md`. It reads the old layout and is not meant to run again. |
| `web-app/Backup_IbnOth/` | An older backup of Ibn Uthaymeen's morning and evening lists, unused by the web app. |

## The web app still at the repo root

The legacy web app — `index.html`, `styles.css`, `script.js`, `main-menu.js`, `data/`, `images/`,
`voices/` — is **still live** on GitHub Pages (farisalrasheed.github.io/AthkarApp), served from the
repo root. It stays there until the Expo app ships (APP_PLAN §1). Then:

1. Move those files into `history/web-app/` (or switch Pages to a `gh-pages` branch first if the
   site should stay up).
2. Delete `voices/` except `012E.m4a`: the other 26 recordings are byte-for-byte copies of files
   in `content/audio/faris-alrasheed/` (checked 2026-09-26).
3. `012E.m4a` is the evening «أمسينا وأمسى الملك لله…» recording. The conversion missed it, so
   `amsayna-almulk-long` has no audio yet. It covers only the first part of that thiker's text —
   listen, then attach it in the editor if it fits.
4. Remove the web-app sections from `eslint.config.js`.
