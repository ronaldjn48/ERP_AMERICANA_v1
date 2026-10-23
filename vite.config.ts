/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: el build funciona en GitHub Pages, en un LMS (Moodle/Canvas) o abierto como carpeta local.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 900 },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
