import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/process': 'http://127.0.0.1:5000',
      '/results': 'http://127.0.0.1:5000'
    }
  },
  define: {
    global: 'window',
  }
})
