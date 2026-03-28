import type { Content, ContentOrderedList, ContentUnorderedList } from 'pdfmake/interfaces';
import type { InlineNode } from '../types';
import { CONTENT_WIDTH, STYLES } from '../config';
import { parseInline, stripLinks } from './parser';

const UL_RE = /^[-*+]\s/;
const OL_RE = /^\d+\.\s/;

export interface ParseContext {
  content: Content[];
  codeLines: string[] | null;
  pendingList: { type: 'ul' | 'ol'; items: { text: InlineNode[] }[] } | null;
}

export function buildCodeBlock(lines: string[]): Content {
  return {
    table: {
      widths: ['*'],
      body: [
        [
          {
            text: lines.join('\n'),
            font: 'iAWriterMono',
            fontSize: STYLES.code.fontSize,
            margin: [...STYLES.code.padding],
            border: [false, false, false, false],
          },
        ],
      ],
    },
    fillColor: STYLES.code.bgColor,
    margin: [0, 4, 0, 8],
  };
}

function makeBlockquote(nodes: InlineNode[]): Content {
  return {
    table: {
      widths: [STYLES.blockquote.barWidth, '*'],
      body: [
        [
          {
            text: '',
            border: [false, false, false, false],
            fillColor: STYLES.blockquote.borderColor,
          },
          {
            text: nodes,
            italics: true,
            color: STYLES.blockquote.textColor,
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

export function flushList(ctx: ParseContext): void {
  if (!ctx.pendingList) return;
  if (ctx.pendingList.type === 'ul') {
    ctx.content.push({ ul: ctx.pendingList.items, margin: [0, 0, 0, 6] } as ContentUnorderedList);
  } else {
    ctx.content.push({ ol: ctx.pendingList.items, margin: [0, 0, 0, 6] } as ContentOrderedList);
  }
  ctx.pendingList = null;
}

interface BlockHandler {
  match(line: string): boolean;
  handle(line: string, ctx: ParseContext, imageMap: Map<string, string | null>): void;
}

const codeHandler: BlockHandler = {
  match: (line) => line.startsWith('```'),
  handle: (_line, ctx) => {
    flushList(ctx);
    if (ctx.codeLines === null) {
      ctx.codeLines = [];
    } else {
      ctx.content.push(buildCodeBlock(ctx.codeLines));
      ctx.codeLines = null;
    }
  },
};

const imageHandler: BlockHandler = {
  match: (line) => /^!\[.*\]\(.+\)$/.test(line.trim()),
  handle: (line, ctx, imageMap) => {
    const imgMatch = line.trim().match(/^!\[(.*)\]\((.+)\)$/);
    if (!imgMatch) return;
    const [, alt, url] = imgMatch;
    const dataUri = imageMap.get(url);
    if (dataUri) {
      ctx.content.push({ image: dataUri, width: CONTENT_WIDTH, margin: [0, 4, 0, 8] });
    } else {
      ctx.content.push({ text: alt || url, italics: true });
    }
  },
};

const ulHandler: BlockHandler = {
  match: (line) => UL_RE.test(line),
  handle: (line, ctx) => {
    if (ctx.pendingList?.type !== 'ul') {
      flushList(ctx);
      ctx.pendingList = { type: 'ul', items: [] };
    }
    ctx.pendingList!.items.push({ text: parseInline(stripLinks(line.replace(/^[-*+]\s+/, ''))) });
  },
};

const olHandler: BlockHandler = {
  match: (line) => OL_RE.test(line),
  handle: (line, ctx) => {
    if (ctx.pendingList?.type !== 'ol') {
      flushList(ctx);
      ctx.pendingList = { type: 'ol', items: [] };
    }
    ctx.pendingList!.items.push({
      text: parseInline(stripLinks(line.replace(/^\d+\.\s+/, ''))),
    });
  },
};

const headingHandler: BlockHandler = {
  match: (line) => /^#{1,6}\s+/.test(line),
  handle: (line, ctx) => {
    flushList(ctx);
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      ctx.content.push({ text: parseInline(stripLinks(headingMatch[2])), style: `h${level}` });
    }
  },
};

const hrHandler: BlockHandler = {
  match: (line) => /^(-{3,}|\*{3,}|_{3,})$/.test(line.trim()),
  handle: (_line, ctx) => {
    flushList(ctx);
    ctx.content.push({
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: CONTENT_WIDTH,
          y2: 0,
          lineWidth: STYLES.hr.lineWidth,
          lineColor: STYLES.hr.color,
        },
      ],
      margin: [0, 6, 0, 6],
    });
  },
};

const blockquoteHandler: BlockHandler = {
  match: (line) => line.startsWith('> '),
  handle: (line, ctx) => {
    flushList(ctx);
    ctx.content.push(makeBlockquote(parseInline(stripLinks(line.slice(2)))));
  },
};

const emptyLineHandler: BlockHandler = {
  match: (line) => line.trim() === '',
  handle: (_line, ctx) => {
    flushList(ctx);
    ctx.content.push({ text: ' ', margin: [0, 0, 0, 8] });
  },
};

export const blockHandlers: BlockHandler[] = [
  codeHandler,
  imageHandler,
  ulHandler,
  olHandler,
  headingHandler,
  hrHandler,
  blockquoteHandler,
  emptyLineHandler,
];

export function handleParagraph(line: string, ctx: ParseContext): void {
  flushList(ctx);
  ctx.content.push({ text: parseInline(stripLinks(line)), margin: [0, 0, 0, 6] });
}
