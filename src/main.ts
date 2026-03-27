import pdfMake from 'pdfmake/build/pdfmake';
import type { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';

import quattroRegular from './fonts/iAWriterQuattroS-Regular.ttf?inline';
import quattroBold from './fonts/iAWriterQuattroS-Bold.ttf?inline';
import quattroItalic from './fonts/iAWriterQuattroS-Italic.ttf?inline';
import monoRegular from './fonts/iAWriterMonoS-Regular.ttf?inline';

const ALLOWED_ORIGIN = 'https://gist-writer.github.io';

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

type InlineNode = { text: string; bold?: boolean; italics?: boolean; font?: string };

function parseInline(raw: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const re = /`([^`]+)`|\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0, m: RegExpExecArray | null;
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

function stripLinks(raw: string): string {
  return raw.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
}

function flushCodeBlock(content: any[], lines: string[]): void {
  content.push({
    table: { widths: ['*'], body: [[{ text: lines.join('\n'), font: 'iAWriterMono', fontSize: 9, margin: [6,6,6,6], border: [false,false,false,false] }]] },
    fillColor: '#f6f8fa', margin: [0, 4, 0, 8],
  });
}

function makeBlockquote(nodes: InlineNode[]): any {
  return {
    table: { widths: [3, '*'], body: [[
      { text: '', border: [false,false,false,false], fillColor: '#e0ddd8' },
      { text: nodes, italics: true, color: '#555555', border: [false,false,false,false], margin: [8,2,0,2] },
    ]] },
    layout: 'noBorders', margin: [0, 0, 0, 6],
  };
}

function markdownToDocDef(filename: string, markdown: string): TDocumentDefinitions {
  const lines = markdown.split('\n');
  const content: any[] = [];
  let inCode = false;
  const codeLines: string[] = [];
  let pendingList: { type: 'ul' | 'ol'; items: any[] } | null = null;

  const flushList = () => {
    if (!pendingList) return;
    content.push({ [pendingList.type]: pendingList.items, margin: [0,0,0,6] });
    pendingList = null;
  };

  for (const line of lines) {
    if (line.startsWith('```')) {
      flushList();
      if (!inCode) { inCode = true; codeLines.length = 0; }
      else { inCode = false; flushCodeBlock(content, codeLines); }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    if (/^[\-\*\+] /.test(line)) {
      if (pendingList?.type !== 'ul') { flushList(); pendingList = { type: 'ul', items: [] }; }
      pendingList.items.push({ text: parseInline(stripLinks(line.slice(2))) });
      continue;
    }
    if (/^\d+\. /.test(line)) {
      if (pendingList?.type !== 'ol') { flushList(); pendingList = { type: 'ol', items: [] }; }
      pendingList.items.push({ text: parseInline(stripLinks(line.replace(/^\d+\.\s+/, ''))) });
      continue;
    }
    flushList();

    if (line.startsWith('###### ')) content.push({ text: parseInline(stripLinks(line.slice(7))), style: 'h6' });
    else if (line.startsWith('##### ')) content.push({ text: parseInline(stripLinks(line.slice(6))), style: 'h5' });
    else if (line.startsWith('#### ')) content.push({ text: parseInline(stripLinks(line.slice(5))), style: 'h4' });
    else if (line.startsWith('### ')) content.push({ text: parseInline(stripLinks(line.slice(4))), style: 'h3' });
    else if (line.startsWith('## ')) content.push({ text: parseInline(stripLinks(line.slice(3))), style: 'h2' });
    else if (line.startsWith('# ')) content.push({ text: parseInline(stripLinks(line.slice(2))), style: 'h1' });
    else if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 435, y2: 0, lineWidth: 0.5, lineColor: '#cccccc' }], margin: [0,6,0,6] });
    else if (line.startsWith('> ')) content.push(makeBlockquote(parseInline(stripLinks(line.slice(2)))));
    else if (line.trim() === '') content.push({ text: ' ', margin: [0,0,0,8] });
    else content.push({ text: parseInline(stripLinks(line)), margin: [0,0,0,6] });
  }
  flushList();
  if (inCode && codeLines.length > 0) flushCodeBlock(content, codeLines);

  return {
    content,
    pageMargins: [60, 60, 60, 60],
    styles: {
      h1: { fontSize: 22, bold: true, color: '#1a1a1a', margin: [0,12,0,6] },
      h2: { fontSize: 18, bold: true, color: '#1a1a1a', margin: [0,10,0,4] },
      h3: { fontSize: 14, bold: true, color: '#1a1a1a', margin: [0,8,0,4] },
      h4: { fontSize: 12, bold: true, color: '#1a1a1a', margin: [0,6,0,4] },
      h5: { fontSize: 11, bold: true, italics: true, color: '#1a1a1a', margin: [0,6,0,4] },
      h6: { fontSize: 10, bold: true, color: '#555555', margin: [0,6,0,4] },
    },
    defaultStyle: { fontSize: 11, font: 'iAWriterQuattro', color: '#1a1a1a', lineHeight: 1.7 },
    info: { title: filename.replace(/\.md$/, '') },
  };
}

window.addEventListener('message', (event) => {
  if (event.origin !== ALLOWED_ORIGIN) return;
  const { type, filename, markdown } = (event.data ?? {}) as { type: string; filename: string; markdown: string };
  if (type !== 'EXPORT_PDF' || !filename || !markdown) return;

  const source = event.source;
  const origin = event.origin;

  pdfMake.createPdf(markdownToDocDef(filename, markdown), undefined, FONT_DICT, vfs)
    .download(filename.replace(/\.md$/, '.pdf'), () => {
      source?.postMessage({ type: 'EXPORT_PDF_DONE' }, { targetOrigin: origin });
    });
});
