import pdfMake from 'pdfmake/build/pdfmake';
import type {
  Content,
  ContentOrderedList,
  ContentUnorderedList,
  TDocumentDefinitions,
  TFontDictionary,
} from 'pdfmake/interfaces';

import quattroRegular from './fonts/iAWriterQuattroS-Regular.ttf?inline';
import quattroBold from './fonts/iAWriterQuattroS-Bold.ttf?inline';
import quattroItalic from './fonts/iAWriterQuattroS-Italic.ttf?inline';
import monoRegular from './fonts/iAWriterMonoS-Regular.ttf?inline';

const ALLOWED_ORIGIN = 'https://gist-writer.github.io';
const CONTENT_WIDTH = 435;

let pdfPending = false;

function downloadPdf(docDef: TDocumentDefinitions, filename: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('PDF download timed out')), 30_000);
    try {
      pdfMake
        .createPdf(docDef, undefined, FONT_DICT, vfs)
        .download(filename.replace(/\.md$/, '.pdf'), () => {
          clearTimeout(timeout);
          resolve();
        });
    } catch (err) {
      clearTimeout(timeout);
      reject(err);
    }
  });
}

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.org/?',
  'https://thingproxy.freeboard.io/fetch/',
];

const FONT_DICT: TFontDictionary = {
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

const vfs: Record<string, string> = {
  'iAWriterQuattroS-Regular.ttf': quattroRegular.split(',')[1],
  'iAWriterQuattroS-Bold.ttf': quattroBold.split(',')[1],
  'iAWriterQuattroS-Italic.ttf': quattroItalic.split(',')[1],
  'iAWriterMonoS-Regular.ttf': monoRegular.split(',')[1],
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  const attempts = [url, ...CORS_PROXIES.map((p) => p + encodeURIComponent(url))];

  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) continue;
      const blob = await res.blob();
      const mime = blob.type || 'image/jpeg';
      const b64 = await blobToBase64(blob);
      return `data:${mime};base64,${b64.split(',')[1]}`;
    } catch {
      continue;
    }
  }

  return null;
}

interface InlineNode {
  text: string;
  bold?: boolean;
  italics?: boolean;
  font?: string;
}

interface ExportPdfMessage {
  type: 'EXPORT_PDF';
  filename: string;
  markdown: string;
}

function isExportPdfMessage(data: unknown): data is ExportPdfMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    (data as Record<string, unknown>).type === 'EXPORT_PDF' &&
    typeof (data as Record<string, unknown>).filename === 'string' &&
    typeof (data as Record<string, unknown>).markdown === 'string' &&
    (data as Record<string, unknown>).filename !== '' &&
    (data as Record<string, unknown>).markdown !== ''
  );
}

export function parseInline(raw: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const re = /`([^`]+)`|\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0,
    m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) nodes.push({ text: raw.slice(last, m.index) });
    if (m[1] !== undefined) nodes.push({ text: m[1], font: 'iAWriterMono' });
    else if (m[2] !== undefined) nodes.push({ text: m[2], bold: true });
    else if (m[3] !== undefined) nodes.push({ text: m[3], italics: true });
    last = m.index + m[0].length;
  }
  if (last < raw.length) nodes.push({ text: raw.slice(last) });
  return nodes.length > 0 ? nodes : [{ text: raw }];
}

export function stripLinks(raw: string): string {
  return raw.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
}

function flushCodeBlock(content: Content[], lines: string[]): void {
  content.push({
    table: {
      widths: ['*'],
      body: [
        [
          {
            text: lines.join('\n'),
            font: 'iAWriterMono',
            fontSize: 9,
            margin: [6, 6, 6, 6],
            border: [false, false, false, false],
          },
        ],
      ],
    },
    fillColor: '#f6f8fa',
    margin: [0, 4, 0, 8],
  });
}

function makeBlockquote(nodes: InlineNode[]): Content {
  return {
    table: {
      widths: [3, '*'],
      body: [
        [
          { text: '', border: [false, false, false, false], fillColor: '#e0ddd8' },
          {
            text: nodes,
            italics: true,
            color: '#555555',
            border: [false, false, false, false],
            margin: [8, 2, 0, 2],
          },
        ],
      ],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 6],
  };
}

async function markdownToDocDef(filename: string, markdown: string): Promise<TDocumentDefinitions> {
  // Pre-fetch all unique image URLs in parallel before the line loop
  const imageUrls = [...new Set([...markdown.matchAll(/^!\[.*\]\((.+)\)$/gm)].map((m) => m[1]))];
  const imageMap = new Map(
    await Promise.all(imageUrls.map(async (url) => [url, await fetchImageAsBase64(url)] as const)),
  );

  const lines = markdown.split('\n');
  const content: Content[] = [];
  let inCode = false;
  const codeLines: string[] = [];
  let pendingList: { type: 'ul' | 'ol'; items: Content[] } | null = null;

  const flushList = () => {
    if (!pendingList) return;
    if (pendingList.type === 'ul') {
      content.push({ ul: pendingList.items, margin: [0, 0, 0, 6] } as ContentUnorderedList);
    } else {
      content.push({ ol: pendingList.items, margin: [0, 0, 0, 6] } as ContentOrderedList);
    }
    pendingList = null;
  };

  for (const line of lines) {
    if (line.startsWith('```')) {
      flushList();
      if (!inCode) {
        inCode = true;
        codeLines.length = 0;
      } else {
        inCode = false;
        flushCodeBlock(content, codeLines);
      }
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }

    // Image lines — detected before stripLinks runs, lookup from pre-fetched map
    const imgMatch = line.trim().match(/^!\[(.*)\]\((.+)\)$/);
    if (imgMatch) {
      const [, alt, url] = imgMatch;
      const dataUri = imageMap.get(url);
      if (dataUri) {
        content.push({ image: dataUri, width: CONTENT_WIDTH, margin: [0, 4, 0, 8] });
      } else {
        content.push({ text: alt || url, italics: true });
      }
      continue;
    }

    if (/^[\-\*\+] /.test(line)) {
      if (pendingList?.type !== 'ul') {
        flushList();
        pendingList = { type: 'ul', items: [] };
      }
      pendingList.items.push({ text: parseInline(stripLinks(line.slice(2))) });
      continue;
    }
    if (/^\d+\. /.test(line)) {
      if (pendingList?.type !== 'ol') {
        flushList();
        pendingList = { type: 'ol', items: [] };
      }
      pendingList.items.push({ text: parseInline(stripLinks(line.replace(/^\d+\.\s+/, ''))) });
      continue;
    }
    flushList();

    if (line.startsWith('###### '))
      content.push({ text: parseInline(stripLinks(line.slice(7))), style: 'h6' });
    else if (line.startsWith('##### '))
      content.push({ text: parseInline(stripLinks(line.slice(6))), style: 'h5' });
    else if (line.startsWith('#### '))
      content.push({ text: parseInline(stripLinks(line.slice(5))), style: 'h4' });
    else if (line.startsWith('### '))
      content.push({ text: parseInline(stripLinks(line.slice(4))), style: 'h3' });
    else if (line.startsWith('## '))
      content.push({ text: parseInline(stripLinks(line.slice(3))), style: 'h2' });
    else if (line.startsWith('# '))
      content.push({ text: parseInline(stripLinks(line.slice(2))), style: 'h1' });
    else if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim()))
      content.push({
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: CONTENT_WIDTH,
            y2: 0,
            lineWidth: 0.5,
            lineColor: '#cccccc',
          },
        ],
        margin: [0, 6, 0, 6],
      });
    else if (line.startsWith('> '))
      content.push(makeBlockquote(parseInline(stripLinks(line.slice(2)))));
    else if (line.trim() === '') content.push({ text: ' ', margin: [0, 0, 0, 8] });
    else content.push({ text: parseInline(stripLinks(line)), margin: [0, 0, 0, 6] });
  }
  flushList();
  if (inCode && codeLines.length > 0) flushCodeBlock(content, codeLines);

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
    defaultStyle: { fontSize: 11, font: 'iAWriterQuattro', color: '#1a1a1a', lineHeight: 1.7 },
    info: { title: filename.replace(/\.md$/, '') },
  };
}

window.addEventListener('message', async (event) => {
  if (event.origin !== ALLOWED_ORIGIN) return;
  if (!isExportPdfMessage(event.data)) return;
  const { filename, markdown } = event.data;

  if (pdfPending) return;
  pdfPending = true;

  const source = event.source;
  const origin = event.origin;

  try {
    const docDef = await markdownToDocDef(filename, markdown);
    await downloadPdf(docDef, filename);
    source?.postMessage({ type: 'EXPORT_PDF_DONE' }, { targetOrigin: origin });
  } catch (err) {
    console.error('[pdf-export] generation failed:', err);
    source?.postMessage({ type: 'EXPORT_PDF_ERROR', error: String(err) }, { targetOrigin: origin });
  } finally {
    pdfPending = false;
  }
});
