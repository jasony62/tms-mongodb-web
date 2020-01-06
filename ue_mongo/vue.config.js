module.exports = {
  publicPath: "/mongo/",
  outputDir: "dist/mongo",
  devServer: {
    proxy: {
      '/mgdb/api': {
        target: 'http://localhost:80'
      },
      '/mgdb/api/mongo': {
        target: 'http://localhost:80'
      },
      '/mgdb/download/': {
        target: 'http://localhost:80'
      },
      '/mgdb/ue/': {
        target: 'http://localhost:80'
      }
    }
  }
}
