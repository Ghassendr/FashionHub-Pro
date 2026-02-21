import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/process': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => '/api/client/videos/process',
      },
      '/results': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => '/api/client/results' + path.replace('/results', ''),
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
})
