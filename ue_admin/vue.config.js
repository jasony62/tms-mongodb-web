const devServer = {
  proxy: {}
}

// 代理auth请求
devServer.proxy[`${process.env.VUE_APP_BACK_API_BASE}`] = {
  target: process.env.VUE_APP_BACK_API_SERVER,
}
devServer.proxy[`${process.env.VUE_APP_BACK_API_BASE}/admin`] = {
  target: process.env.VUE_APP_BACK_API_SERVER,
}
// 代理api请求
devServer.proxy[`${process.env.VUE_APP_BACK_AUTH_BASE}`] = {
  target: process.env.VUE_APP_BACK_AUTH_SERVER
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
    }
  },
  devServer,
  parallel: require('os').cpus().length > 1,
  runtimeCompiler: true
}

