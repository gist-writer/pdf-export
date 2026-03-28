# Code Review Refactor

The codebase is a Vite + TypeScript microapp that converts markdown to styled PDFs via pdfmake and the `postMessage` API. A comprehensive review (issue #6) surfaced **22 findings** across 7 categories: 3 critical, 11 important, 8 nice-to-have. This roadmap addresses all of them in a strict tranche order — each tranche produces a working, deployable app.

## Why

The app works, but has production-grade reliability gaps:

- **Silent failures** — the parent window never learns when PDF generation crashes, and a single failure can permanently deadlock exports until page reload.
- **Zero tests** — any change to the markdown parser risks silent regressions across headings, lists, code blocks, images, blockquotes, and inline formatting.
- **Monolithic design** — all 213 lines live in `src/main.ts`, mixing font setup, markdown parsing, image fetching, PDF generation, and message handling.
- **Broken deploy script** — non-standard semver rollover and macOS-specific `sed` that fails in CI.
- **Type safety workarounds** — `as unknown as Content` casts, loose message typing, no runtime validation.

## Architecture

Current state — everything in one file:

```
src/
  main.ts         ← 213 lines: fonts, parsing, images, PDF gen, message handler
  fonts/
    *.ttf         ← font files
    vfs.ts        ← 575KB dead code (never imported)
  vite-env.d.ts
```

Target state after T6:

```
src/
  main.ts              ← entry point: message listener only
  config.ts            ← constants (ALLOWED_ORIGIN, CONTENT_WIDTH, CORS_PROXIES)
  fonts.ts             ← font dictionary + VFS setup
  pdf.ts               ← createPdf / downloadPdf wrapper
  images.ts            ← fetchImageAsBase64, blobToBase64
  types.ts             ← InlineNode, ExportPdfMessage, Block
  markdown/
    parser.ts          ← markdownToDocDef, parseInline, stripLinks
    blocks.ts          ← block handlers (heading, list, code, blockquote, hr, image)
  __tests__/
    markdown.test.ts
    images.test.ts
  fonts/
    *.ttf
  vite-env.d.ts
```

## Packages

```bash
# Remove (T2)
# (delete src/fonts/vfs.ts — not an npm package, just dead code)

# Add (T2)
npm install -D vitest

# Add (T3)
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier
```

## Tranches

| File | Scope | Status |
| :--- | :---- | :----- |
| [t1.md](./t1.md) | Critical error handling — silent failures + pdfPending deadlock | `done` |
| [t2.md](./t2.md) | Testing foundation + dead code removal | `done` |
| [t3.md](./t3.md) | Deploy script fixes + linting/formatting setup | `done` |
| [t4.md](./t4.md) | Type safety — proper pdfmake types + message validation | `done` |
| [t5.md](./t5.md) | Parser refactor — headings, lists, inline markup | `done` |
| [t6.md](./t6.md) | Module split + architecture cleanup | `done` |

## Things to Know

- The app runs inside an iframe. The parent communicates via `postMessage` with origin `ALLOWED_ORIGIN`. Every response goes back via `event.source.postMessage`.
- Fonts are loaded via Vite's `?inline` import of `.ttf` files — this returns base64 strings at build time. The `vfs.ts` file is a separate base64 encoding that is never used.
- pdfmake's `.download()` is callback-based, not Promise-based. The callback fires after the browser download dialog triggers.
- The three CORS proxies (`corsproxy.io`, `api.allorigins.win`, `api.codetabs.com`) are uncontrolled third-party services used to fetch remote images.
- `pdfPending` is a global mutex that prevents concurrent PDF generation. If it gets stuck `true`, no further exports work until page reload.
- Current version: `v0.5.3`. Tranche versions will start at `v0.5.4`.

## Deploy

```bash
npm run dev      # local development
npm run build    # production build (tsc + vite)
npm run preview  # preview production build
```
