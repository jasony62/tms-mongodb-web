import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [vue()],
  server: {
    port: 9000,
    proxy: {
      '/auth': 'http://localhost:3000',
      '/api/admin': 'http://localhost:3000',

  }
  },
})
