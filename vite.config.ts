import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Firebase SDK — loaded once, cached across visits
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            // Charting library — only needed by Dashboard & Laporan
            recharts: ['recharts'],
            // PDF generation — only needed when user exports reports
            pdf: ['jspdf', 'jspdf-autotable', 'html2canvas'],
            // Animation engine
            motion: ['motion'],
          },
        },
      },
      // Suppress the chunk size warning since we're intentionally splitting
      chunkSizeWarningLimit: 800,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
