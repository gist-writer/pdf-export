import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { InlineNode } from '../types';
import { STYLES } from '../config';
import { fetchImageAsBase64 } from '../images';
import {
  blockHandlers,
  buildCodeBlock,
  flushList,
  handleParagraph,
  type ParseContext,
} from './blocks';

export function parseInline(raw: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const re = /`([^`]+)`|\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0,
    m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) nodes.push({ text: raw.slice(last, m.index) });
    if (m[1] !== undefined) nodes.push({ text: m[1], font: 'iAWriterMono' });
    else if (m[2] !== undefined) nodes.push({ text: m[2], bold: true, italics: true });
    else if (m[3] !== undefined) nodes.push({ text: m[3], bold: true });
    else if (m[4] !== undefined) nodes.push({ text: m[4], italics: true });
    last = m.index + m[0].length;
  }
  if (last < raw.length) nodes.push({ text: raw.slice(last) });
  return nodes.length > 0 ? nodes : [{ text: raw }];
}

export function stripLinks(raw: string): string {
  return raw.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
}

export async function markdownToDocDef(
  filename: string,
  markdown: string,
): Promise<TDocumentDefinitions> {
  const imageUrls = [...new Set([...markdown.matchAll(/^!\[.*\]\((.+)\)$/gm)].map((m) => m[1]))];
  const imageMap = new Map(
    await Promise.all(imageUrls.map(async (url) => [url, await fetchImageAsBase64(url)] as const)),
  );

  const lines = markdown.split('\n');
  const ctx: ParseContext = {
    content: [],
    codeLines: null,
    pendingList: null,
  };

  for (const line of lines) {
    if (ctx.codeLines !== null && !line.startsWith('```')) {
      ctx.codeLines.push(line);
      continue;
    }

    let handled = false;
    for (const handler of blockHandlers) {
      if (handler.match(line)) {
        handler.handle(line, ctx, imageMap);
        handled = true;
        break;
      }
    }
    if (!handled) {
      handleParagraph(line, ctx);
    }
  }

  flushList(ctx);
  if (ctx.codeLines !== null && ctx.codeLines.length > 0) {
    ctx.content.push(buildCodeBlock(ctx.codeLines));
  }

  return {
    content: ctx.content as Content,
    pageMargins: [...STYLES.page.margins],
    styles: {
      h1: { fontSize: 22, bold: true, color: STYLES.text.color, margin: [0, 12, 0, 6] },
      h2: { fontSize: 18, bold: true, color: STYLES.text.color, margin: [0, 10, 0, 4] },
      h3: { fontSize: 14, bold: true, color: STYLES.text.color, margin: [0, 8, 0, 4] },
      h4: { fontSize: 12, bold: true, color: STYLES.text.color, margin: [0, 6, 0, 4] },
      h5: {
        fontSize: 11,
        bold: true,
        italics: true,
        color: STYLES.text.color,
        margin: [0, 6, 0, 4],
      },
      h6: { fontSize: 10, bold: true, color: '#555555', margin: [0, 6, 0, 4] },
    },
    defaultStyle: {
      fontSize: 11,
      font: 'iAWriterQuattro',
      color: STYLES.text.color,
      lineHeight: 1.7,
    },
    info: { title: filename.replace(/\.md$/, '') },
  };
}
