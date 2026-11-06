# Attendance

A personal attendance register for the sessions I conduct, replacing per-module Excel sheets.
No login and no backend: all data is stored in the browser (IndexedDB), and the app is hosted on GitHub Pages.

## Develop

```bash
npm install
npm run dev
npm test
```

## Data model

Batch → Students (shared by every module the batch takes)
Module (batch, code, title, lecturers, min %) → Sessions → Marks (P / A / E)

Attendance % = Present ÷ (Held − Excused). A held session with no mark counts as absent and is flagged.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes to GitHub Pages.
One-time setup: repo **Settings → Pages → Source: GitHub Actions**.

## Data safety

- The repo and site are public; student data never leaves the browser. `.gitignore` blocks `.xlsx`/`.csv`/backup files.
- Clearing site data or switching browser loses records. Download a JSON backup regularly (the app reminds you after 7 days).
