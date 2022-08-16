import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return defineConfig({
    base: env.VITE_BASE_URL ? env.VITE_BASE_URL : '/',
    build: {
      outDir: env.VITE_BASE_URL ? `dist${env.VITE_BASE_URL}/` : 'dist',
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    plugins: [vue()],
    server: {
      port: 9000,
      proxy: {
        '/api': 'http://localhost:3001',
        '/fs': 'http://localhost:3001',
        '/auth': 'http://localhost:3001',
      },
    },
  })
}
