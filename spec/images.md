# Images spec

Covers image rendering in `src/main.ts` — how block-level markdown images are detected, fetched, and passed to pdfmake.

---

## Scope

Only **block-level** images are handled — lines where the entire line is an image:

```
![alt text](https://example.com/photo.jpg)
```

Inline images embedded within a sentence (`some text ![x](url) more text`) are out of scope and treated as regular text.

---

## Detection

Image lines are detected inside the line-parsing loop in `markdownToDocDef` as the **first** branch, before `stripLinks` runs. The check is a line-level regex match — if the entire trimmed line is an image, it is handled as an image and `stripLinks` is never called on it:

```ts
const imgMatch = line.match(/^!\[(.*)\]\((.+)\)$/);
if (imgMatch) {
  // handle as image — continue skips stripLinks and all other branches
  continue;
}
// only reaches here for non-image lines
const stripped = stripLinks(line);
```

This is a **line-level gate**, not a regex modification. `stripLinks` itself is unchanged — it is simply never called on image lines.

---

## Fetch pipeline — `fetchImageAsBase64(url)`

Attempts to fetch the image and return a base64 data URI. Returns `null` on total failure.

### Attempt order

1. **Direct** — `fetch(url)` — works for any CORS-open host (Imgur, `raw.githubusercontent.com`, most CDNs)
2. **allorigins.win** — `https://api.allorigins.win/raw?url=<encoded>`
3. **corsproxy.org** — `https://corsproxy.org/?<encoded>`
4. **thingproxy** — `https://thingproxy.freeboard.io/fetch/<encoded>`

Each attempt uses `AbortSignal.timeout(2000)` — 2 seconds per attempt. Worst-case with all four attempts timing out: 8 seconds. If a response is received but `res.ok` is false, the attempt is skipped immediately without waiting for the full timeout.

### MIME type

MIME type is read from `blob.type`, which reflects the `Content-Type` header forwarded by the proxy. Falls back to `'image/jpeg'` if `blob.type` is empty.

### Return value

```
data:<mime>;base64,<base64-encoded-image-bytes>
```

This is passed directly to pdfmake as the `image` property.

---

## Rendering

On successful fetch:

```ts
{ image: dataUri, width: 435, margin: [0, 4, 0, 8] }
```

`width: 435` is full column width in the default pdfmake A4 page layout (595pt wide, 40pt margins each side, 80pt total → 515pt usable, minus standard indent → 435pt practical maximum).

On failed fetch (all attempts exhausted or `null` returned):

```ts
{ text: alt || url, italics: true }
```

The PDF always exports. A failed image never prevents the download.

---

## Concurrency guard

A module-level `pdfPending` boolean prevents a second export from starting while images are being fetched:

```ts
let pdfPending = false;
```

The `message` event handler checks `pdfPending` immediately on entry. If `true`, it returns without processing. On entry with `false`, it sets `pdfPending = true`. `pdfPending` resets to `false` inside the `.download()` callback on success, and inside the `catch` block on error — ensuring the lock releases only after the download completes, not when `createPdf` returns.

---

## `stripLinks` and image lines

Image lines are detected **before** `stripLinks` is called — not by modifying `stripLinks` itself. The line-parsing loop checks for `![` at the start of the trimmed line first. If matched, the image branch runs and `continue` skips the rest of the loop body, including `stripLinks`. `stripLinks` is never called on an image line and remains unchanged.

---

## Manual testing

Open `https://gist-writer.github.io/pdf-export/` and run these commands from the DevTools console.

### Happy path — real image renders

```js
window.postMessage(
  {
    type: 'EXPORT_PDF',
    filename: 'test-real.md',
    markdown: `# Real image\n\n![cat](https://i.imgur.com/CzXTtJV.jpg)\n\nDone.`
  },
  '*'
)
```

Expected: `test-real.pdf` downloads. Image renders at full column width between the heading and "Done."

### Fallback path — CORS-blocked URL

```js
window.postMessage(
  {
    type: 'EXPORT_PDF',
    filename: 'test-fallback.md',
    markdown: `# Fallback test\n\n![blocked image](https://notion.so/fake.png)`
  },
  '*'
)
```

Expected: `test-fallback.pdf` downloads. Italic text *blocked image* appears where the image would be. Console will show three CORS/network errors as the proxy chain is exhausted — this is normal.

### Text-only — no regression

```js
window.postMessage(
  {
    type: 'EXPORT_PDF',
    filename: 'test-text.md',
    markdown: `# Text only\n\nNo images here. [link text](https://example.com) should strip to plain text.`
  },
  '*'
)
```

Expected: `test-text.pdf` downloads. Link renders as plain `link text`, no URL visible.

---

## Known limitations

- **CORS-blocked hosts** — Notion, Dropbox, Google Drive direct links, private S3 buckets, and hosts that require auth cookies will fail all fetch attempts and render as italic alt text. This is a browser security constraint and cannot be resolved client-side without a dedicated server-side proxy.
- **Proxy availability** — the three fallback proxies are free public services with no SLA. If all are down simultaneously, CORS-blocked images fall back to alt text. CORS-open images (direct fetch) are unaffected.
- **Inline images** — `some text ![x](url) more text` is not handled. The image URL is preserved in the text output as a raw string.
- **Image sizing** — all images render at `width: 435`. No per-image size control.
- **SVG** — pdfmake does not support SVG natively. SVG URLs will fetch successfully but pdfmake will fail to render them. Result is a broken image node; fallback to alt text not triggered automatically in this case.
