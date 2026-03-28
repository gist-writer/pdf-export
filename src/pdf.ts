import pdfMake from 'pdfmake/build/pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { FONT_DICT, vfs } from './fonts';
import { markdownToDocDef } from './markdown/parser';

export function downloadPdf(docDef: TDocumentDefinitions, filename: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('PDF download timed out'));
      }
    }, 30_000);
    try {
      pdfMake.createPdf(docDef, undefined, FONT_DICT, vfs)
        .download(filename.replace(/\.md$/, '.pdf'), () => {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            resolve();
          }
        });
    } catch (err) {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(err);
      }
    }
  });
}

export async function createPdf(filename: string, markdown: string): Promise<void> {
  const docDef = await markdownToDocDef(filename, markdown);
  await downloadPdf(docDef, filename);
}
