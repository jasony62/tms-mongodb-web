const devServer = { proxy: {} }

//代理auth请求
devServer.proxy[`${process.env.VUE_APP_BACK_AUTH_BASE}`] = { target: process.env.VUE_APP_BACK_AUTH_SERVER }
//代理base api请求
devServer.proxy[`${process.env.VUE_APP_BACK_API_BASE}`] = { target: process.env.VUE_APP_BACK_API_SERVER }
devServer.proxy[`${process.env.VUE_APP_BACK_API_PLUGIN}`] = { target: process.env.VUE_APP_BACK_API_SERVER }

module.exports = {
  publicPath: "/mongo/",
  outputDir: "dist/mongo",
  devServer
}
