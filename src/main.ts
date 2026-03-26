import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = (pdfFonts as any).pdfMake.vfs;

const ALLOWED_ORIGIN = 'https://gist-writer.github.io';

type Content = object;

function markdownToDocDef(filename: string, markdown: string): object {
  const lines = markdown.split('\n');
  const content: Content[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      content.push({ text: parseInline(line.slice(4)), style: 'h3' });
    } else if (line.startsWith('## ')) {
      content.push({ text: parseInline(line.slice(3)), style: 'h2' });
    } else if (line.startsWith('# ')) {
      content.push({ text: parseInline(line.slice(2)), style: 'h1' });
    } else if (line.trim() === '') {
      // blank line → paragraph break (skip)
    } else {
      content.push({ text: parseInline(line), margin: [0, 0, 0, 6] as [number, number, number, number] });
    }

    i++;
  }

  return {
    content,
    styles: {
      h1: { fontSize: 22, bold: true, margin: [0, 12, 0, 6] },
      h2: { fontSize: 18, bold: true, margin: [0, 10, 0, 4] },
      h3: { fontSize: 14, bold: true, margin: [0, 8, 0, 4] },
    },
    defaultStyle: { fontSize: 11, font: 'Roboto' },
    info: { title: filename.replace(/\.md$/, '') },
  };
}

type InlineNode = { text: string; bold?: boolean; italics?: boolean };

function parseInline(raw: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  // Regex: **bold**, *italic*, plain
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) {
      nodes.push({ text: raw.slice(last, m.index) });
    }
    if (m[1] !== undefined) {
      nodes.push({ text: m[1], bold: true });
    } else if (m[2] !== undefined) {
      nodes.push({ text: m[2], italics: true });
    }
    last = m.index + m[0].length;
  }

  if (last < raw.length) {
    nodes.push({ text: raw.slice(last) });
  }

  return nodes.length > 0 ? nodes : [{ text: raw }];
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
  pdfMake.createPdf(docDef).download(filename.replace(/\.md$/, '.pdf'));

  event.source?.postMessage(
    { type: 'EXPORT_PDF_DONE' },
    { targetOrigin: event.origin }
  );
});
