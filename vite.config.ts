import { defineConfig, Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

function ttfBase64Plugin(): Plugin {
  return {
    name: 'ttf-base64',
    transform(_code, id) {
      if (!id.endsWith('.ttf')) return null;
      const buf = fs.readFileSync(id);
      const b64 = buf.toString('base64');
      return { code: `export default "${b64}";`, map: null };
    },
  };
}

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
  base: '/pdf-export/',
  plugins: [ttfBase64Plugin()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
