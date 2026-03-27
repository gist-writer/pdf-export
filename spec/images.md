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

Image lines are detected inside the line-parsing loop in `markdownToDocDef` as the **first** branch, before `stripLinks` runs:

```ts
const imgMatch = line.match(/^!\[(.*)\]\((.+)\)$/);
```

If matched, the line is handled as an image and `continue` skips all subsequent parsing branches. `stripLinks` is never called on an image line.

---

## Fetch pipeline — `fetchImageAsBase64(url)`

Attempts to fetch the image and return a base64 data URI. Returns `null` on total failure.

### Attempt order

1. **Direct** — `fetch(url)` — works for any CORS-open host (Imgur, `raw.githubusercontent.com`, most CDNs)
2. **allorigins.win** — `https://api.allorigins.win/raw?url=<encoded>`
3. **corsproxy.org** — `https://corsproxy.org/?<encoded>`
4. **thingproxy** — `https://thingproxy.freeboard.io/fetch/<encoded>`

Each attempt uses `AbortSignal.timeout(5000)` — 5 seconds per attempt. If a response is received but `res.ok` is false, the attempt is skipped immediately without waiting for the full timeout.

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
{ image: dataUri, width: 435 }
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

The `message` event handler checks `pdfPending` immediately on entry. If `true`, it returns without processing. On entry with `false`, it sets `pdfPending = true`. A `try/finally` block resets `pdfPending = false` and sends `EXPORT_PDF_DONE` on all exit paths — including unexpected errors.

---

## `stripLinks` fix

The original `stripLinks` regex matched both `[text](url)` and `![alt](url)`, silently stripping image syntax before detection. Fixed with a negative lookbehind:

```ts
// Before:
text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')

// After:
text.replace(/(?<!!)\[([^\]]+)\]\([^)]*\)/g, '$1')
```

`(?<!!)` ensures the regex does not match when preceded by `!`. Links continue to be stripped to their text; image syntax is preserved for the image detection branch.

---

## Known limitations

- **CORS-blocked hosts** — Notion, Dropbox, Google Drive direct links, private S3 buckets, and hosts that require auth cookies will fail all fetch attempts and render as italic alt text. This is a browser security constraint and cannot be resolved client-side without a dedicated server-side proxy.
- **Proxy availability** — the three fallback proxies are free public services with no SLA. If all are down simultaneously, CORS-blocked images fall back to alt text. CORS-open images (direct fetch) are unaffected.
- **Inline images** — `some text ![x](url) more text` is not handled. The image URL is preserved in the text output as a raw string.
- **Image sizing** — all images render at `width: 435`. No per-image size control.
- **SVG** — pdfmake does not support SVG natively. SVG URLs will fetch successfully but pdfmake will fail to render them. Result is a broken image node; fallback to alt text not triggered automatically in this case.
