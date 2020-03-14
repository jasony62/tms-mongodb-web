const devServer = {
  proxy: {}
}
// const rewriteAuth = {}
// rewriteAuth[process.env.VUE_APP_BACK_AUTH_BASE] = process.env.VUE_APP_BACK_AUTH_BASE_REWRITE
// 代理auth请求
devServer.proxy[`${process.env.VUE_APP_BACK_API_BASE}`] = {
  target: process.env.VUE_APP_BACK_API_SERVER,
}
devServer.proxy[`${process.env.VUE_APP_BACK_API_BASE}/admin`] = {
  target: process.env.VUE_APP_BACK_API_SERVER,
}
devServer.proxy[`${process.env.VUE_APP_BACK_DOWNLOAD_BASE}`] = {
  target: process.env.VUE_APP_BACK_API_SERVER,
}
// 代理api请求
devServer.proxy[`${process.env.VUE_APP_BACK_UE_BASE}`] = {
  target: process.env.VUE_APP_BACK_API_SERVER
}

module.exports = {
  publicPath: '/admin/',
  outputDir: './dist/admin',
  filenameHashing: true,
  pages: {
    index: {
      entry: 'src/main.js',
      template: 'public/index.html',
      filename: './index.html',
      title: 'tms-finder',
      chunks: ['chunk-vendors', 'chunk-common', 'index']
    }
  },
  devServer,
  parallel: require('os').cpus().length > 1,
  runtimeCompiler: true
}

