module.exports = {
  publicPath: "/admin/",
  outputDir: "./dist/admin",
  devServer: {
    proxy: {
      '/mgdb/api': {
        target: 'http://localhost:80'
      },
      '/mgdb/api/admin': {
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

