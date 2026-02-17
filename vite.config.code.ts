import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'es2015',
    lib: {
      entry: path.resolve(__dirname, 'src/code.ts'),
      formats: ['iife'],
      name: 'FigXedPlugin',
      fileName: () => 'code.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        // Strip the IIFE wrapper variable assignment
        extend: true,
      },
    },
    minify: false,
    sourcemap: false,
  },
  esbuild: {
    target: 'es2015',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
