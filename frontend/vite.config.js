import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    port: 5173,
    proxy: {
      '/process': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: () => '/api/client/videos/process',
      },
      '/results': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) =>
          '/api/client/results' + path.replace('/results', ''),
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  define: {
    global: 'window',
  },

  // 🔧 Stabilise les dépendances entre machines
  optimizeDeps: {
    force: true,
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      'scheduler',
      'stats.js',
      'use-sync-external-store/shim/with-selector.js',
    ],
    needsInterop: [
      'scheduler',
      'stats.js',
      'use-sync-external-store/shim/with-selector.js',
    ],
    exclude: ['three', '@react-three/fiber', '@react-three/drei'],
  },

  // 🔧 Stabilise le CSS en dev
  css: {
    devSourcemap: true,
  },

  build: {
    commonjsOptions: {
      include: [
        /use-sync-external-store/,
        /scheduler/,
        /stats\.js/,
        /node_modules/,
      ],
    },

    // 🔧 Empêche les différences de chunks → évite bugs CSS
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})