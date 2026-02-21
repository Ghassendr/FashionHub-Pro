import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
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
})
