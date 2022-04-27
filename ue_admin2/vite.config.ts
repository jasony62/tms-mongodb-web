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
    // 主用于本地调试
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
