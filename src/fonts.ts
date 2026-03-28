import type { TFontDictionary } from 'pdfmake/interfaces';

import iAWriterQuattroRegular from './fonts/iAWriterQuattroS-Regular.ttf?inline';
import iAWriterQuattroBold from './fonts/iAWriterQuattroS-Bold.ttf?inline';
import iAWriterQuattroItalic from './fonts/iAWriterQuattroS-Italic.ttf?inline';
import iAWriterMonoRegular from './fonts/iAWriterMonoS-Regular.ttf?inline';

export const FONT_DICT: TFontDictionary = {
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

export const vfs: Record<string, string> = {
  'iAWriterQuattroS-Regular.ttf': iAWriterQuattroRegular.split(',')[1],
  'iAWriterQuattroS-Bold.ttf': iAWriterQuattroBold.split(',')[1],
  'iAWriterQuattroS-Italic.ttf': iAWriterQuattroItalic.split(',')[1],
  'iAWriterMonoS-Regular.ttf': iAWriterMonoRegular.split(',')[1],
};
