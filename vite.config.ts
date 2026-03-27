import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pdf-export/',
  assetsInclude: ['**/*.ttf'],
  build: {
    outDir: 'dist',
    sourcemap: false,
    assetsInlineLimit: 1024 * 1024, // 1 MB — inlines TTF as base64 into the JS bundle
  },
});
