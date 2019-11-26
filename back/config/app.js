module.exports = {
  port: 3000,
  name: 'tms-mongodb-web-back',
  router: {
    auth: {
      prefix: 'auth' // 接口调用url的前缀
    },
    controllers: {
      prefix: 'api' // 接口调用url的前缀，例如：/api
    }
  },
  tmsTransaction: false
}
