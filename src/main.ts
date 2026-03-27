import pdfMake from 'pdfmake/build/pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

// iA Writer fonts — TTF files committed to src/fonts/
import quattroRegularUrl from './fonts/iAWriterQuattroS-Regular.ttf?url';
import quattroBoldUrl from './fonts/iAWriterQuattroS-Bold.ttf?url';
import quattroItalicUrl from './fonts/iAWriterQuattroS-Italic.ttf?url';
import monoRegularUrl from './fonts/iAWriterMonoS-Regular.ttf?url';

const ALLOWED_ORIGIN = 'https://gist-writer.github.io';

// Load font files as ArrayBuffers and convert to base64 for pdfmake vfs.
async function loadFonts(): Promise<void> {
  async function toBase64(url: string): Promise<string> {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  const [regular, bold, italic, mono] = await Promise.all([
    toBase64(quattroRegularUrl),
    toBase64(quattroBoldUrl),
    toBase64(quattroItalicUrl),
    toBase64(monoRegularUrl),
  ]);

  pdfMake.vfs = {
    'iAWriterQuattroS-Regular.ttf': regular,
    'iAWriterQuattroS-Bold.ttf': bold,
    'iAWriterQuattroS-Italic.ttf': italic,
    'iAWriterMonoS-Regular.ttf': mono,
  };

  pdfMake.fonts = {
    iAWriterQuattro: {
      normal: 'iAWriterQuattroS-Regular.ttf',
      bold: 'iAWriterQuattroS-Bold.ttf',
      italics: 'iAWriterQuattroS-Italic.ttf',
      bolditalics: 'iAWriterQuattroS-Bold.ttf',
    },
    iAWriterMono: {
      normal: 'iAWriterMonoS-Regular.ttf',
      bold: 'iAWriterMonoS-Regular.ttf',
      italics: 'iAWriterMonoS-Regular.ttf',
      bolditalics: 'iAWriterMonoS-Regular.ttf',
    },
  };
}

// Initialise fonts once on load; queue any export requests that arrive
// before fonts are ready.
let fontsReady = false;
let pendingExport: (() => void) | null = null;

loadFonts().then(() => {
  fontsReady = true;
  pendingExport?.();
  pendingExport = null;
});

type InlineNode = { text: string; bold?: boolean; italics?: boolean; font?: string };

// Parses **bold**, *italic*, and `code` spans within a line.
function parseInline(raw: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const re = /`([^`]+)`|\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) {
      nodes.push({ text: raw.slice(last, m.index) });
    }
    if (m[1] !== undefined) {
      nodes.push({ text: m[1], font: 'iAWriterMono' });
    } else if (m[2] !== undefined) {
      nodes.push({ text: m[2], bold: true });
    } else if (m[3] !== undefined) {
      nodes.push({ text: m[3], italics: true });
    }
    last = m.index + m[0].length;
  }

  if (last < raw.length) {
    nodes.push({ text: raw.slice(last) });
  }

  return nodes.length > 0 ? nodes : [{ text: raw }];
}

// Strips a markdown link [text](url) down to just the link text.
function stripLinks(raw: string): string {
  return raw.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
}

function flushCodeBlock(content: any[], codeLines: string[]): void {
  content.push({
    table: {
      widths: ['*'],
      body: [[
        {
          text: codeLines.join('\n'),
          font: 'iAWriterMono',
          fontSize: 9,
          margin: [6, 6, 6, 6],
          border: [false, false, false, false],
        },
      ]],
    },
    fillColor: '#f6f8fa',
    margin: [0, 4, 0, 8],
  });
}

function markdownToDocDef(filename: string, markdown: string): TDocumentDefinitions {
  const lines = markdown.split('\n');
  const content: any[] = [];

  let inFencedCode = false;
  const codeLines: string[] = [];

  // Pending list collector — null when no list is open.
  let pendingList: { type: 'ul' | 'ol'; items: any[] } | null = null;

  function flushList(): void {
    if (!pendingList) return;
    content.push({
      [pendingList.type]: pendingList.items,
      margin: [0, 0, 0, 6],
    });
    pendingList = null;
  }

  for (const line of lines) {

    // --- Fenced code blocks ---
    if (line.startsWith('```')) {
      flushList();
      if (!inFencedCode) {
        inFencedCode = true;
        codeLines.length = 0;
      } else {
        inFencedCode = false;
        flushCodeBlock(content, codeLines);
      }
      continue;
    }
    if (inFencedCode) {
      codeLines.push(line);
      continue;
    }

    // --- Unordered list item ---
    if (/^[\-\*\+] /.test(line)) {
      if (pendingList?.type !== 'ul') {
        flushList();
        pendingList = { type: 'ul', items: [] };
      }
      pendingList.items.push({ text: parseInline(stripLinks(line.slice(2))) });
      continue;
    }

    // --- Ordered list item ---
    if (/^\d+\. /.test(line)) {
      if (pendingList?.type !== 'ol') {
        flushList();
        pendingList = { type: 'ol', items: [] };
      }
      pendingList.items.push({ text: parseInline(stripLinks(line.replace(/^\d+\.\s+/, ''))) });
      continue;
    }

    // Any non-list line closes the pending list before processing.
    flushList();

    // --- Headings ---
    if (line.startsWith('###### ')) {
      content.push({ text: parseInline(stripLinks(line.slice(7))), style: 'h6' });
    } else if (line.startsWith('##### ')) {
      content.push({ text: parseInline(stripLinks(line.slice(6))), style: 'h5' });
    } else if (line.startsWith('#### ')) {
      content.push({ text: parseInline(stripLinks(line.slice(5))), style: 'h4' });
    } else if (line.startsWith('### ')) {
      content.push({ text: parseInline(stripLinks(line.slice(4))), style: 'h3' });
    } else if (line.startsWith('## ')) {
      content.push({ text: parseInline(stripLinks(line.slice(3))), style: 'h2' });
    } else if (line.startsWith('# ')) {
      content.push({ text: parseInline(stripLinks(line.slice(2))), style: 'h1' });

    // --- Horizontal rule ---
    } else if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 435, y2: 0, lineWidth: 0.5, lineColor: '#cccccc' }], margin: [0, 6, 0, 6] });

    // --- Blockquote ---
    } else if (line.startsWith('> ')) {
      content.push({ text: parseInline(stripLinks(line.slice(2))), italics: true, color: '#555555', margin: [12, 0, 0, 6] });

    // --- Blank line — paragraph spacer ---
    } else if (line.trim() === '') {
      content.push({ text: ' ', margin: [0, 0, 0, 8] });

    // --- Plain paragraph ---
    } else {
      content.push({ text: parseInline(stripLinks(line)), margin: [0, 0, 0, 6] });
    }
  }

  // Flush any trailing open state after the last line.
  flushList();
  if (inFencedCode && codeLines.length > 0) {
    flushCodeBlock(content, codeLines);
  }

  return {
    content,
    pageMargins: [60, 60, 60, 60],
    styles: {
      h1: { fontSize: 22, bold: true, color: '#1a1a1a', margin: [0, 12, 0, 6] },
      h2: { fontSize: 18, bold: true, color: '#1a1a1a', margin: [0, 10, 0, 4] },
      h3: { fontSize: 14, bold: true, color: '#1a1a1a', margin: [0, 8, 0, 4] },
      h4: { fontSize: 12, bold: true, color: '#1a1a1a', margin: [0, 6, 0, 4] },
      h5: { fontSize: 11, bold: true, italics: true, color: '#1a1a1a', margin: [0, 6, 0, 4] },
      h6: { fontSize: 10, bold: true, color: '#555555', margin: [0, 6, 0, 4] },
    },
    defaultStyle: {
      fontSize: 11,
      font: 'iAWriterQuattro',
      color: '#1a1a1a',
      lineHeight: 1.7,
    },
    info: { title: filename.replace(/\.md$/, '') },
  };
}

function runExport(
  source: MessageEventSource | null,
  origin: string,
  filename: string,
  markdown: string,
): void {
  const docDef = markdownToDocDef(filename, markdown);
  pdfMake.createPdf(docDef).download(filename.replace(/\.md$/, '.pdf'), () => {
    source?.postMessage(
      { type: 'EXPORT_PDF_DONE' },
      { targetOrigin: origin },
    );
  });
}

window.addEventListener('message', (event) => {
  if (event.origin !== ALLOWED_ORIGIN) return;

  const { type, filename, markdown } = (event.data ?? {}) as {
    type: string;
    filename: string;
    markdown: string;
  };

  if (type !== 'EXPORT_PDF' || !filename || !markdown) return;

  const source = event.source;
  const origin = event.origin;

  if (fontsReady) {
    runExport(source, origin, filename, markdown);
  } else {
    pendingExport = () => runExport(source, origin, filename, markdown);
  }
});
