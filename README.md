# pdf-export

![Deploy](https://github.com/gist-writer/pdf-export/actions/workflows/deploy.yml/badge.svg)

Companion GitHub Pages app for [Gist Writer](https://github.com/gist-writer/gist-writer-app). Receives markdown over `postMessage`, renders a PDF client-side using `pdfmake`, and triggers the download — keeping the main app's bundle at zero added bytes.

🔗 **Live:** https://gist-writer.github.io/pdf-export/

---

## Why this exists

`pdfmake` compiles to ~953 kB minified (~333 kB gzipped). Bundling it into the main app would add that payload to every page load, for every user, even those who never export a PDF.

Instead this app lives at its own URL. The main app injects it as a hidden iframe only when the user clicks "Download PDF", sends the markdown over `postMessage`, and removes the iframe once the download is done. Users who never export pay nothing.

This also means the PDF renderer can be updated or replaced entirely without touching the main app.

---

## How it works

```
main app (gist-writer)            pdf-export iframe
────────────────────────────────────────────────────
iframe injected (hidden)
iframe load fires
  → postMessage EXPORT_PDF ──────▶ listener receives message
                                   origin validated
                                   pdfmake renders + downloads
                         ◀──────── postMessage EXPORT_PDF_DONE
iframe removed
```

Origin is hardcoded to `https://gist-writer.github.io` on both sides. Messages from any other origin are silently dropped.

---

## Development

```bash
npm install
npm run dev      # Vite dev server at localhost:5173
npm run build    # outputs to dist/
npm run preview  # local preview of dist/
```

---

## Deploy

Deploys via GitHub Actions on a **tag push** — not on every commit to `main`. This keeps the live renderer stable while allowing work-in-progress commits.

### First time setup

```bash
git clone https://github.com/gist-writer/pdf-export.git
cd pdf-export
chmod +x deploy.sh
```

### Every subsequent deploy

```bash
./deploy.sh
```

`deploy.sh` will:
1. `git pull` latest from `main`
2. Read the latest tag and bump the patch version (e.g. `v0.1.0 → v0.1.1`)
3. Commit the version bump in `package.json`
4. Push the commit
5. Tag and push the tag

GitHub Actions then:
1. Runs `npm install`
2. Runs `vite build` — outputs to `dist/`
3. Pushes `dist/` to the `gh-pages` branch
4. GitHub Pages serves it at `https://gist-writer.github.io/pdf-export/`

### Verify the deploy

Open https://gist-writer.github.io/pdf-export/ in Chrome, open DevTools (`⌘⌥J`), and run:

```js
window.postMessage(
  { type: 'EXPORT_PDF', filename: 'test.md', markdown: '# Hello\n\nWorld' },
  'https://gist-writer.github.io'
);
```

> Chrome will prompt **"Allow pasting"** the first time — type `allow pasting` and press Enter, then paste and run the command.

A `test.pdf` should download with a heading and a paragraph.

### Debugging

**`Cannot read properties of undefined (reading 'vfs')`**  
pdfmake's vfs_fonts didn't load. Check the Network tab for a failed import of `vfs_fonts.js`. Usually a Vite bundling issue — check `src/main.ts` vfs assignment.

**No download, no errors**  
The `postMessage` origin didn't match. Make sure you're running the command on `https://gist-writer.github.io/pdf-export/` — not `localhost` or any other origin.

**`message channel closed before a response was received`**  
Safe to ignore — this is a browser extension (e.g. 1Password, uBlock) intercepting messages, not your code.

**`Failed to execute 'put' on 'Cache': Request scheme 'chrome-extension' is unsupported`**  
Also safe to ignore — a browser extension trying to cache its own resources via the service worker. Not related to pdf-export.

---

## Stack

| Layer | Tech |
|-------|------|
| PDF rendering | pdfmake |
| Build | Vite |
| Hosting | GitHub Pages |
