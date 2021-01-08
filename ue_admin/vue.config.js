const { DllReferencePlugin } = require('webpack')
const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin')
const { library } = require('./dll.config')
const path = require('path')

const devServer = {
  proxy: {}
}

devServer.proxy[`${process.env.VUE_APP_BACK_AUTH_BASE}`] = {
  target: process.env.VUE_APP_BACK_AUTH_SERVER
}
devServer.proxy[`${process.env.VUE_APP_BACK_API_BASE}`] = {
  target: process.env.VUE_APP_BACK_API_SERVER
}
devServer.proxy[`${process.env.VUE_APP_BACK_API_FS}`] = {
  target: process.env.VUE_APP_BACK_API_SERVER
}

module.exports = {
  publicPath: `${process.env.VUE_APP_BASE_URL}`,
  outputDir: `./dist${process.env.VUE_APP_BASE_URL}`,
  filenameHashing: true,
  pages: {
    index: {
      entry: 'src/main.js',
      template: 'public/index.html',
      filename: './index.html',
      title: process.env.VUE_APP_TITLE,
      chunks: ['chunk-vendors', 'chunk-common', 'index']
    },
    invite: {
      entry: 'src/invite.js',
      template: 'public/index.html',
      filename: './invite.html',
      title: process.env.VUE_APP_TITLE,
      chunks: ['chunk-vendors', 'chunk-common', 'invite']
    }
  },
  devServer,
  parallel: require('os').cpus().length > 1,
  runtimeCompiler: true,
  productionSourceMap: process.env.NODE_ENV !== 'production',
  configureWebpack: config => {
    // 开发环境
    if (config.mode === 'development') {
      const dev = {
        plugins: [
          // new BundleAnalyzerPlugin(),
          // new SpeedMeasurePlugin(),
          // 开发环境使用DllPlugin,加快本地构建速度
          ...Object.keys(library).map(name => {
            return new DllReferencePlugin({
              manifest: path.resolve(__dirname, 'dll', `${name}.manifest.json`)
            })
          }),
          new AddAssetHtmlPlugin(
            Object.keys(library).map(name => {
              return {
                filepath: path.resolve(__dirname, 'dll', `${name}.dll.js`)
              }
            })
          )
        ]
      }
      return dev
    }
    // 生产环境
    if (config.mode === 'production') {
      // 设置cdn第三方包
      config.externals = {}
      const prod = {
        plugins: []
      }
      return prod
    }
  }
}
