import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/appsheet-api': {
        target: 'https://api.appsheet.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/appsheet-api/, '')
      },
      '/misa-auth': {
        target: 'https://actapp.misa.vn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/misa-auth/, '')
      },
      '/misa-api': {
        target: 'https://actapp.misa.vn', 
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/misa-api/, '')
      }
    }
  }
})
