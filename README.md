# pdf-export

![Deploy](https://github.com/gist-writer/pdf-export/actions/workflows/deploy.yml/badge.svg)

Standalone GitHub Pages app that receives markdown over `postMessage`, renders a PDF via `pdfmake`, and triggers the download. Used by [Gist Writer](https://gist-writer.github.io) — loaded as a hidden iframe only when the user exports, so the main app's bundle pays nothing.

**Live:** https://gist-writer.github.io/pdf-export/

---

## PDF output

### Typography

- **Body font:** Roboto (pdfmake bundled), 11pt
- **Code font:** Courier, 9pt
- **Page margins:** pdfmake defaults (~40pt each side)
- **Page numbers / headers / footers:** none

### Heading scale

| Level | Size | Style |
|---|---|---|
| H1 (`#`) | 22pt | Bold |
| H2 (`##`) | 18pt | Bold |
| H3 (`###`) | 14pt | Bold |
| H4 (`####`) | 12pt | Bold |
| H5 (`#####`) | 11pt | Bold italic |
| H6 (`######`) | 10pt | Bold, `#555555` |

### Block elements

| Element | Rendering |
|---|---|
| Fenced code block (` ``` `) | `#f6f8fa` background, Courier 9pt, 6pt padding, no border |
| Blockquote (`>`) | Italic, `#555555`, 12pt left indent — no left border |
| Horizontal rule (`---`) | 0.5pt `#cccccc` line |
| Blank line | 8pt spacer |
| Paragraph | 6pt bottom margin |

### Inline elements

| Syntax | Rendering |
|---|---|
| `**bold**` | Bold |
| `*italic*` | Italic |
| `` `code` `` | Courier font |
| `[text](url)` | Link text only — URLs are stripped |

### Known gaps

- No brand color on headings (all black)
- No custom font (Inter or similar) matching the editor
- No left-border accent on blockquotes
- No page numbers or filename footer
- Tables not supported — rendered as raw text
- Nested lists not supported
- Images not supported

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
