import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Khớp với applicationUrl trong WebApplication1/Properties/launchSettings.json
        target: process.env.VITE_API_URL || 'http://localhost:5065',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: process.env.VITE_API_URL || 'http://localhost:5065',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
