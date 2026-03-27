import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pdf-export/',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.svg', '**/*.gif', '**/*.ico', '**/*.webp'],
  build: {
    outDir: 'dist',
    sourcemap: false,
    assetsInlineLimit: 200000,
  },
});
