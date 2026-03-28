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
