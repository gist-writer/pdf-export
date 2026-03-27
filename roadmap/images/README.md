# Image Support in PDF Export — Issue #132

> Render block-level markdown images (`![alt](url)`) as real images in the exported PDF.

## Objective

When `main.ts` encounters a line matching `![alt](url)`, fetch the image, convert it to a base64 data URI, and pass it to pdfmake as an `{ image, width }` node. Fall back to italic alt text if the fetch fails for any reason (CORS, 404, timeout, proxy down).

## Design Decisions

| Decision | Choice |
|---|---|
| Fetch strategy | Direct fetch first; fall back through proxy chain on failure |
| Proxy chain | `allorigins.win` → `corsproxy.org` → `thingproxy.freeboard.io` |
| Timeout per attempt | `AbortSignal.timeout(5000)` — 5s per attempt, 20s worst-case |
| MIME detection | `blob.type` from response — reflects `Content-Type` forwarded by proxy |
| Fallback | `{ text: altText, italics: true }` — PDF always exports, never crashes |
| Scope | Block-level images only — line must match `/^!\[.*\]\(.*\)$/` |
| Inline images | Out of scope — `some text ![x](url) more text` ignored |
| Image width | `435` — full column width in pdfmake default page layout |
| Concurrency guard | Boolean `pdfPending` lock — prevents double-export during async fetch |
| `stripLinks` fix | Negative lookbehind `(?<!!)` so image syntax is not swallowed |
| `markdownToDocDef` | Becomes `async` to await image fetches before building doc definition |
| Files touched | `src/main.ts` only |

## Files Touched

| File | Tranches |
|------|----------|
| `src/main.ts` | t1, t2, t3 |

## Tranche Order

| Tranche | Scope |
|---------|-------|
| [t1.md](./t1.md) | Fix `stripLinks` + add boolean concurrency lock |
| [t2.md](./t2.md) | `fetchImageAsBase64()` — direct fetch + proxy chain with timeout |
| [t3.md](./t3.md) | Make `markdownToDocDef` async, detect image lines, wire fetch + fallback |

## Verification Checklist

- [ ] Imgur URL in markdown → image renders in PDF at full column width
- [ ] `raw.githubusercontent.com` URL → image renders
- [ ] CORS-blocked URL (e.g. Notion) → italic alt text appears, PDF still downloads
- [ ] All proxies down (mock with DevTools) → italic alt text, no crash
- [ ] Two rapid PDF exports → second is blocked by `pdfPending` lock
- [ ] `[text](url)` link → still renders as plain text (not broken by stripLinks fix)
- [ ] `![alt](url)` inline within a sentence → treated as plain text (out of scope)
- [ ] No TypeScript errors
- [ ] No new dependencies
