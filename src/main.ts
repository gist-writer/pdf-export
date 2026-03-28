import { ALLOWED_ORIGIN } from './config';
import { isExportPdfMessage } from './types';
import { createPdf } from './pdf';

let pdfPending = false;

window.addEventListener('message', async (event) => {
  if (event.origin !== ALLOWED_ORIGIN) return;
  if (!isExportPdfMessage(event.data)) return;
  if (pdfPending) return;
  pdfPending = true;

  const { filename, markdown } = event.data;
  const source = event.source;
  const origin = event.origin;

  try {
    await createPdf(filename, markdown);
    source?.postMessage({ type: 'EXPORT_PDF_DONE' }, { targetOrigin: origin });
  } catch (err) {
    console.error('[pdf-export] generation failed:', err);
    source?.postMessage({ type: 'EXPORT_PDF_ERROR', error: String(err) }, { targetOrigin: origin });
  } finally {
    pdfPending = false;
  }
});
