import pdfMake from 'pdfmake/build/pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { FONT_DICT, vfs } from './fonts';
import { markdownToDocDef } from './markdown/parser';

export function downloadPdf(docDef: TDocumentDefinitions, filename: string): Promise<void> {
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

export async function createPdf(filename: string, markdown: string): Promise<void> {
  const docDef = await markdownToDocDef(filename, markdown);
  await downloadPdf(docDef, filename);
}
