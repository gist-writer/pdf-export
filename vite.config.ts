import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pdf-export/',
  assetsInclude: ['**/*.ttf'],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
