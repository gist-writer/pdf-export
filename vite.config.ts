import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pdf-export/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
