# pdf-export

A standalone GitHub Pages microapp that listens for `postMessage` events and exports styled PDFs using **iA Writer Quattro** (body) and **iA Writer Mono** (code blocks) via pdfmake.

Live at: `https://gist-writer.github.io/pdf-export/`

---

## How it works

The parent app sends a `postMessage`:

```js
window.postMessage(
  { type: 'EXPORT_PDF', filename: 'note.md', markdown: '# Hello\n\nWorld' },
  'https://gist-writer.github.io'
);
```

The iframe receives it, converts markdown to a pdfmake document definition, and triggers a PDF download. On completion it sends back `{ type: 'EXPORT_PDF_DONE' }`.

---

## Font setup

Fonts are embedded at **build time** using Vite's `?inline` import — the full TTF is base64-encoded and baked directly into the JS bundle. No runtime fetching, no network dependency.

### Font files required

All four must be **static** TTF variants (not variable fonts) from [`iaolo/iA-Fonts`](https://github.com/iaolo/iA-Fonts) at commit `f733920`:

```bash
cd src/fonts
curl -L -o iAWriterQuattroS-Regular.ttf \
  "https://github.com/iaolo/iA-Fonts/raw/f733920/iA%20Writer%20Quattro/Static/iAWriterQuattroS-Regular.ttf"
curl -L -o iAWriterQuattroS-Bold.ttf \
  "https://github.com/iaolo/iA-Fonts/raw/f733920/iA%20Writer%20Quattro/Static/iAWriterQuattroS-Bold.ttf"
curl -L -o iAWriterQuattroS-Italic.ttf \
  "https://github.com/iaolo/iA-Fonts/raw/f733920/iA%20Writer%20Quattro/Static/iAWriterQuattroS-Italic.ttf"
curl -L -o iAWriterMonoS-Regular.ttf \
  "https://github.com/iaolo/iA-Fonts/raw/f733920/iA%20Writer%20Mono/Static/iAWriterMonoS-Regular.ttf"
```

Expected file sizes:

| File | Size |
|------|------|
| iAWriterQuattroS-Regular.ttf | ~116 KB |
| iAWriterQuattroS-Bold.ttf | ~117 KB |
| iAWriterQuattroS-Italic.ttf | ~102 KB |
| iAWriterMonoS-Regular.ttf | ~95 KB |

> **Important:** Do NOT use variable TTFs (~304 KB each). pdfkit (used internally by pdfmake) only supports static TTF and OTF. Variable fonts and WOFF/WOFF2 will throw `Unknown font format`.

### How fonts are embedded

In `src/main.ts`:

```ts
import quattroRegular from './fonts/iAWriterQuattroS-Regular.ttf?inline';
// ...etc

const vfs: Record<string, string> = {
  'iAWriterQuattroS-Regular.ttf': quattroRegular.split(',')[1], // strip data:font/ttf;base64, prefix
  // ...etc
};
```

Vite's `?inline` embeds the TTF as a base64 data URI. The `.split(',')[1]` strips the `data:font/ttf;base64,` prefix — pdfmake VFS needs raw base64 only.

The resulting JS bundle is **~1.86 MB** (~589 KB of that is font data).

---

## PDF output size

Exported PDFs are **small by design** — typically 18–30 KB for a short document. This is correct behaviour.

pdfmake uses **font subsetting**: only the glyphs (characters) actually used in the document are embedded in the PDF, not the full font files. A short test document uses ~200 unique glyphs, producing a small PDF. A long document with many unique characters will produce a proportionally larger PDF.

**Do not use file size alone to verify fonts are working.** Use the bundle check below instead.

---

## Testing

### Verify fonts are embedded in the bundle

Open `https://gist-writer.github.io/pdf-export/` in an incognito window, open DevTools console (`Cmd+Option+J`) and run:

```js
fetch(document.querySelector('script[src*="index"]').src)
  .then(r => r.text())
  .then(t => {
    const m = t.match(/data:font\/ttf;base64,([A-Za-z0-9+/]{20})/);
    console.log(m ? 'FONTS EMBEDDED: ' + m[1] : 'NO INLINE FONTS FOUND');
  });
```

✅ `FONTS EMBEDDED: AAEAAAASAQAABAAgRFNJ...` — working correctly  
❌ `NO INLINE FONTS FOUND` — fonts not in bundle, build is broken

### Trigger a PDF export

```js
window.postMessage(
  { type: 'EXPORT_PDF', filename: 'test.md', markdown: '# Hello\n\n**Bold** and *italic* and `code`\n\n> A blockquote' },
  'https://gist-writer.github.io'
);
```

PDF downloads. Open it — body text should render in **iA Writer Quattro** serif, not Helvetica. Code should render in **iA Writer Mono**.

### Verify PDF font in terminal

```bash
strings test.pdf | grep FontName
# Should output: /FontName /BZZZZZ+iAWriterQuattroS-Regular
# The BZZZZZ+ prefix is pdfmake's font subset tag — this confirms real fonts, not fallback
```

---

## Deploy

```bash
./deploy.sh
```

Bumps the version in `package.json`, commits, pushes a version tag, triggers GitHub Actions which builds with Vite and pushes `dist/` to the `gh-pages` branch.

Monitor at: `https://github.com/gist-writer/pdf-export/actions`

---

## Architecture

- **Vite** + **TypeScript** — build tool
- **pdfmake** — PDF generation in-browser
- **GitHub Pages** — hosting (`gh-pages` branch)
- `src/main.ts` — all logic: font loading, markdown parser, pdfmake document definition
- `vite.config.ts` — minimal config, `assetsInlineLimit: 200000` ensures TTFs inline via `?inline`
