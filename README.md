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

## Image support

Images on their own line are fetched and embedded as base64 at export time. If the fetch fails, the image is replaced with italic alt text — the PDF always exports.

Fetch strategy: direct → `allorigins.win` → `corsproxy.org` → italic alt text. Each attempt has a hard timeout. Inline images (`some text ![x](url) more text`) are not supported.

---

## Font setup

Fonts are embedded at build time via Vite's `?inline` import — baked into the JS bundle, no runtime fetching. All four must be **static** TTF variants (not variable fonts) from [`iaolo/iA-Fonts`](https://github.com/iaolo/iA-Fonts) at commit `f733920`:

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

> **Important:** Do NOT use variable TTFs. pdfkit only supports static TTF/OTF — variable fonts and WOFF/WOFF2 will throw `Unknown font format`.

---

## Testing

### Verify fonts are embedded in the bundle

```js
fetch(document.querySelector('script[src*="index"]').src)
  .then(r => r.text())
  .then(t => {
    const m = t.match(/data:font\/ttf;base64,([A-Za-z0-9+/]{20})/);
    console.log(m ? 'FONTS EMBEDDED: ' + m[1] : 'NO INLINE FONTS FOUND');
  });
```

### Trigger a PDF export

```js
window.postMessage(
  { type: 'EXPORT_PDF', filename: 'test.md', markdown: '# Hello\n\n**Bold** and *italic* and `code`\n\n> A blockquote' },
  'https://gist-writer.github.io'
);
```

### Verify PDF font in terminal

```bash
strings test.pdf | grep FontName
# Should output: /FontName /BZZZZZ+iAWriterQuattroS-Regular
```

---

## Deploy

```bash
./deploy.sh
```

Bumps version, commits, pushes a tag — GitHub Actions builds and deploys to `gh-pages`.

Monitor at: `https://github.com/gist-writer/pdf-export/actions`
