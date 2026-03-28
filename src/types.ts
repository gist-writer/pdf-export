export interface InlineNode {
  text: string;
  bold?: boolean;
  italics?: boolean;
  font?: string;
}

export interface ExportPdfMessage {
  type: 'EXPORT_PDF';
  filename: string;
  markdown: string;
}

export function isExportPdfMessage(data: unknown): data is ExportPdfMessage {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    d.type === 'EXPORT_PDF' &&
    typeof d.filename === 'string' &&
    typeof d.markdown === 'string' &&
    d.filename !== '' &&
    d.markdown !== ''
  );
}
