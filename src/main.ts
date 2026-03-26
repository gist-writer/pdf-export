import pdfMake from 'pdfmake/build/pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

// pdfmake v0.2.x: vfs_fonts exports the vfs object directly
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = (pdfFonts as any).vfs ?? (pdfFonts as any).default?.vfs ?? (pdfFonts as any).pdfMake?.vfs;

const ALLOWED_ORIGIN = 'https://gist-writer.github.io';

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
      // inline code — strip backticks, render in Courier
      nodes.push({ text: m[1], font: 'Courier' });
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

function markdownToDocDef(filename: string, markdown: string): TDocumentDefinitions {
  const lines = markdown.split('\n');
  const content: TDocumentDefinitions['content'] = [];
  let inFencedCode = false;
  const codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // --- Fenced code blocks ---
    if (line.startsWith('```')) {
      if (!inFencedCode) {
        inFencedCode = true;
        codeLines.length = 0;
      } else {
        inFencedCode = false;
        (content as any[]).push({
          table: {
            widths: ['*'],
            body: [[
              {
                text: codeLines.join('\n'),
                font: 'Courier',
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
      continue;
    }
    if (inFencedCode) {
      codeLines.push(line);
      continue;
    }

    // --- Headings ---
    if (line.startsWith('###### ')) {
      (content as any[]).push({ text: parseInline(stripLinks(line.slice(7))), style: 'h6' });
    } else if (line.startsWith('##### ')) {
      (content as any[]).push({ text: parseInline(stripLinks(line.slice(6))), style: 'h5' });
    } else if (line.startsWith('#### ')) {
      (content as any[]).push({ text: parseInline(stripLinks(line.slice(5))), style: 'h4' });
    } else if (line.startsWith('### ')) {
      (content as any[]).push({ text: parseInline(stripLinks(line.slice(4))), style: 'h3' });
    } else if (line.startsWith('## ')) {
      (content as any[]).push({ text: parseInline(stripLinks(line.slice(3))), style: 'h2' });
    } else if (line.startsWith('# ')) {
      (content as any[]).push({ text: parseInline(stripLinks(line.slice(2))), style: 'h1' });

    // --- Horizontal rule ---
    } else if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      (content as any[]).push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#cccccc' }], margin: [0, 6, 0, 6] });

    // --- Blockquote ---
    } else if (line.startsWith('> ')) {
      (content as any[]).push({
        text: parseInline(stripLinks(line.slice(2))),
        italics: true,
        color: '#555555',
        margin: [12, 0, 0, 6],
      });

    // --- Unordered list item ---
    } else if (/^[\-\*\+] /.test(line)) {
      (content as any[]).push({
        ul: [{ text: parseInline(stripLinks(line.slice(2))) }],
        margin: [0, 0, 0, 2],
      });

    // --- Ordered list item ---
    } else if (/^\d+\. /.test(line)) {
      const text = line.replace(/^\d+\.\s+/, '');
      (content as any[]).push({
        ol: [{ text: parseInline(stripLinks(text)) }],
        margin: [0, 0, 0, 2],
      });

    // --- Blank line — paragraph spacer ---
    } else if (line.trim() === '') {
      (content as any[]).push({ text: ' ', margin: [0, 0, 0, 8] });

    // --- Plain paragraph ---
    } else {
      (content as any[]).push({ text: parseInline(stripLinks(line)), margin: [0, 0, 0, 6] });
    }
  }

  return {
    content,
    styles: {
      h1: { fontSize: 22, bold: true, margin: [0, 12, 0, 6] },
      h2: { fontSize: 18, bold: true, margin: [0, 10, 0, 4] },
      h3: { fontSize: 14, bold: true, margin: [0, 8, 0, 4] },
      h4: { fontSize: 12, bold: true, margin: [0, 6, 0, 4] },
      h5: { fontSize: 11, bold: true, italics: true, margin: [0, 6, 0, 4] },
      h6: { fontSize: 10, bold: true, color: '#555555', margin: [0, 6, 0, 4] },
    },
    defaultStyle: { fontSize: 11, font: 'Roboto' },
    info: { title: filename.replace(/\.md$/, '') },
  };
}

window.addEventListener('message', (event) => {
  if (event.origin !== ALLOWED_ORIGIN) return;

  const { type, filename, markdown } = (event.data ?? {}) as {
    type: string;
    filename: string;
    markdown: string;
  };

  if (type !== 'EXPORT_PDF' || !filename || !markdown) return;

  const docDef = markdownToDocDef(filename, markdown);
  const source = event.source;
  const origin = event.origin;

  // Post EXPORT_PDF_DONE only after the PDF has been fully generated
  // and the download has been triggered. pdfMake.download() is async —
  // calling postMessage before the callback would signal completion
  // before the file is ready, causing the parent to tear down the iframe early.
  pdfMake.createPdf(docDef).download(filename.replace(/\.md$/, '.pdf'), () => {
    source?.postMessage(
      { type: 'EXPORT_PDF_DONE' },
      { targetOrigin: origin },
    );
  });
});
