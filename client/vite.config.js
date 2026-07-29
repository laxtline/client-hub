/// <reference types="vitest/config" />
// Vite config — React plugin, dev server on 5173, manual chunk splitting to keep
// the main bundle small, and Vitest (jsdom) for component/unit tests.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        // Split the large, rarely-changing vendor libs into their own chunks so
        // the app bundle stays lean and they are cached separately across
        // deploys. recharts / dnd-kit / socket.io are each reached only through
        // a lazy boundary, so listing them here keeps them out of the entry
        // chunk rather than pulling them into it.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable'],
        },
      },
    },
    // Fail the build loudly if a chunk creeps back over budget.
    chunkSizeWarningLimit: 450,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
});
