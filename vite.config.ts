import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pdf-export/',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
