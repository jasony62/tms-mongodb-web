import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const BASE_URL = process.env.VITE_BASE_URL
  ? process.env.VITE_BASE_URL
  : '/plugin/'

// https://vitejs.dev/config/
export default defineConfig({
  base: BASE_URL,
  build: {
    outDir: `dist${BASE_URL}`,
  },
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@vue/shared': resolve(__dirname, 'node_modules/@vue/shared'),
    },
  },
  server: {
    port: parseInt(process.env.DEV_SERVER_PORT) || 9001
  },
})
