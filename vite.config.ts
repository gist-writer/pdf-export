import { defineConfig, Plugin } from 'vite';
import fs from 'fs';

function ttfBase64Plugin(): Plugin {
  return {
    name: 'ttf-base64',
    enforce: 'pre',
    load(id) {
      if (!id.endsWith('.ttf')) return null;
      const buf = fs.readFileSync(id);
      const b64 = buf.toString('base64');
      return { code: `export default "${b64}";`, map: null };
    },
  };
}

export default defineConfig({
  base: '/pdf-export/',
  plugins: [ttfBase64Plugin()],
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.svg', '**/*.gif', '**/*.ico', '**/*.webp'],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
