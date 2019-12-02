module.exports = {
  port: 3630,
  name: 'tms-mongodb-web-back',
  router: {
    auth: {
      prefix: '/mgdb/auth' // 接口调用url的前缀
    },
    controllers: {
      prefix: '/mgdb/api' // 接口调用url的前缀，例如：/api
    }
  },
  tmsTransaction: false
}
