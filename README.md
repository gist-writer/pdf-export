# pdf-export

![Deploy](https://github.com/gist-writer/pdf-export/actions/workflows/deploy.yml/badge.svg)

Standalone GitHub Pages app that receives markdown over `postMessage`, renders a PDF via `pdfmake`, and triggers the download. Used by [Gist Writer](https://gist-writer.github.io) — loaded as a hidden iframe only when the user exports, so the main app's bundle pays nothing.

**Live:** https://gist-writer.github.io/pdf-export/

---

## Dev

```bash
npm install
npm run dev
```

---

## Deploy

```bash
# First time
chmod +x deploy.sh

# Every time
./deploy.sh
```

Bumps the patch version, commits, tags, and pushes. GitHub Actions builds and deploys to GitHub Pages automatically.

### Verify

Open https://gist-writer.github.io/pdf-export/ and run in the DevTools console:

```js
window.postMessage(
  { type: 'EXPORT_PDF', filename: 'test.md', markdown: '# Hello\n\nWorld' },
  'https://gist-writer.github.io'
);
```

`test.pdf` should download.
