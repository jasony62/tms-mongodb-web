import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

const env = loadEnv(process.env.NODE_ENV, './')

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [vue()],
  base: env.VITE_BASE_URL ? env.VITE_BASE_URL : '/',
  server: {
    port: 9000,
    proxy: {
      '/api': 'http://localhost:3001',
      '/auth': 'http://localhost:3001',
    },
  },
})
