import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(), // Place Tailwind en premier pour qu'il traite le CSS avant React
    react()
  ],
  server: {
    port: 5173,
    proxy: {
      // Utilise des regex plus précises pour éviter d'intercepter des fichiers statiques/CSS
      '^/api/.*': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/process': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Utilise une fonction de réécriture plus flexible
        rewrite: (path) => path.replace(/^\/process/, '/api/client/videos/process'),
      },
      '/results': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/results/, '/api/client/results'),
      },
    },
  },
  build: {
    cssCodeSplit: false
  }
})
