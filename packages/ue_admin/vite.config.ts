import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  const BASE_URL = env.VITE_BASE_URL ? env.VITE_BASE_URL : '/admin/'

  return defineConfig({
    base: BASE_URL,
    build: {
      outDir: `dist${BASE_URL}`,
      // minify: false,
      // rollupOptions: {
      //   manualChunks(id) {
      //     if (id.includes('node_modules')) {
      //       return 'vendor'
      //     }
      //   },
      // },
    },
    resolve: {
      alias: [
        {
          find: '@',
          replacement: resolve(__dirname, 'src'),
        },
        {
          find: '@antv/x6',
          replacement: '@antv/x6/dist/x6.js',
        },
        {
          find: '@antv/x6-vue-shape',
          replacement: '@antv/x6-vue-shape/lib',
        },
      ],
    },
    plugins: [vue()],
    server: {
      port: parseInt(process.env.DEV_SERVER_PORT) || 9000,
      fs: {
        strict: false,
        allow: [],
      },
    },
  })
}
