import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
<<<<<<< HEAD
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [tailwindcss(), react()],
    server: {
        port: 5173,
        proxy: {
            '/process': {
                target: 'http://localhost:8000', // Assuming backend runs on 8000
                changeOrigin: true,
            },
            '/results': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            }
        }
    }
=======

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
>>>>>>> 79d324d3f41813facfd92db59e17056b73c678e1
})
