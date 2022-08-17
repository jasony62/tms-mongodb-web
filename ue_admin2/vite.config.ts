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
      port: parseInt(process.env.SERVER_PORT) || 9000,
      fs: {
        strict: false,
        allow: [],
      },
      proxy: {
        '/api': 'http://localhost:3000',
        '/auth': 'http://localhost:3000',
      }
    },
  })
}
