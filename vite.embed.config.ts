import { defineConfig } from 'vite';

// Compilación incrustada: un solo archivo para páginas en iframe (aulas virtuales, publicación web).
// React se carga desde cdnjs; impresión y descargas se reemplazan por "copiar al portapapeles".
const shim = (f: string) =>
  decodeURIComponent(new URL(`./scripts/shims/${f}`, import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');

export default defineConfig({
  base: './',
  define: { 'import.meta.env.VITE_EMBED': JSON.stringify('1') },
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: [
      { find: /^react\/jsx-runtime$/, replacement: shim('jsx-runtime.js') },
      { find: /^react-dom\/client$/, replacement: shim('react-dom-client.js') },
      { find: /^react$/, replacement: shim('react.js') },
    ],
  },
  build: {
    outDir: 'dist-embed',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: {
      input: 'src/main.tsx',
      output: { format: 'iife', inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: 'app[extname]' },
    },
  },
});
