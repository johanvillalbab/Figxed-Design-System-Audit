import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

/**
 * Figma plugin iframes don't reliably support ES module scripts.
 * This plugin rewrites the inlined <script type="module" crossorigin>
 * tag to a plain <script> tag so the IIFE executes correctly.
 */
function figmaPluginHtml(): Plugin {
  return {
    name: 'figma-plugin-html',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'asset' && typeof file.source === 'string' && file.fileName.endsWith('.html')) {
          // Just remove module type and crossorigin.
          // We don't need to move the script because src/ui/index.tsx
          // now handles waiting for DOMContentLoaded.
          file.source = file.source
            .replace(/<script type="module" crossorigin>/g, '<script>')
            .replace(/<script type="module">/g, '<script>');
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), viteSingleFile(), figmaPluginHtml()],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'es2020',
    rollupOptions: {
      input: 'src/ui/index.html',
      output: {
        entryFileNames: 'ui.js',
        inlineDynamicImports: true,
      },
    },
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    modulePreload: false,
  },
  esbuild: {
    target: 'es2020',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
