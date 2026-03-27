import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pdf-export/',
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.svg', '**/*.gif', '**/*.ico', '**/*.webp'],
  build: {
    outDir: 'dist',
    sourcemap: false,
    assetsInlineLimit: 200000,
  },
});
