# pdf-export

A minimal iframe service that converts Markdown to a downloadable PDF, using [pdfmake](https://pdfmake.github.io/) and [iA Writer Quattro](https://github.com/iaolo/iA-Fonts) fonts. Deployed to GitHub Pages and consumed by the main gist-writer app via `postMessage`.

## Architecture

The parent app (`gist-writer`) opens this service in a hidden iframe at `https://gist-writer.github.io/pdf-export/`. When the user triggers a PDF export, the parent posts a message:

```js
window.postMessage(
  { type: 'EXPORT_PDF', filename: 'note.md', markdown: '# Hello\n\n...' },
  'https://gist-writer.github.io'
);
```

The iframe receives the message, renders the Markdown into a pdfmake document definition, and triggers a browser download. When complete it posts back:

```js
{ type: 'EXPORT_PDF_DONE' }
```

## Font solution

pdfmake requires fonts as base64 strings in its virtual file system (VFS). The challenge:

- **Variable TTFs don't work.** The iaolo iA-Fonts repo now ships variable-axis TTFs (~296 KB each). pdfkit (used internally by pdfmake) rejects these with `Unknown font format`.
- **Static TTFs do work.** The static variants from commit [`f733920`](https://github.com/iaolo/iA-Fonts/tree/f733920) of iaolo/iA-Fonts are ~116 KB each and parse correctly.

The font files are committed to `src/fonts/` and imported with Vite's `?url` suffix, which emits them as content-hashed assets. At runtime, the service fetches each font as an `ArrayBuffer`, converts to base64 via chunked `btoa`, and passes the result directly to `pdfMake.createPdf()` as the 4th argument (`vfs`). This bypasses `pdfMake.vfs` global state entirely.

```ts
// Fetch font and convert ArrayBuffer → base64
function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  let out = '';
  for (let i = 0; i < bytes.length; i += chunk)
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(out);
}

// Fonts are loaded once on page init via a shared Promise
const vfsPromise = Promise.all([
  fetch(quattroRegularUrl).then(r => r.arrayBuffer()).then(toBase64),
  // ...
]).then(([regular, bold, italic, mono]) => ({ ... }));

// At export time:
const vfs = await vfsPromise;
pdfMake.createPdf(docDef, undefined, FONT_DICT, vfs).download(...);
```

## Fonts

To update or replace fonts, download static TTFs and place them in `src/fonts/`:

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

Verify each file is ~116 KB. Files ~296 KB are variable fonts and will not work.

## Development

```bash
npm install
npm run dev
```

## Deployment

Deployment is triggered by pushing a `v*` tag. The `deploy.sh` script handles version bump, commit, and tag:

```bash
./deploy.sh
```

The workflow builds with Vite and publishes `dist/` to the `gh-pages` branch via `peaceiris/actions-gh-pages`.

## Markdown support

| Element | Syntax |
|---|---|
| Headings | `#` through `######` |
| Bold | `**text**` |
| Italic | `*text*` |
| Inline code | `` `code` `` |
| Code block | ` ``` ` fenced |
| Blockquote | `> text` |
| Unordered list | `- item` |
| Ordered list | `1. item` |
| Horizontal rule | `---` |
| Links | rendered as plain text |
