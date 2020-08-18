let appConfig = {
  router: {
    auth: {
      prefix: '/order/auth' // 接口调用url的前缀
    },
    controllers: {
      prefix: '/order/api' // 接口调用url的前缀，例如：/api
    },
    plugins: {
      prefix: '/order/plugin' // 接口调用url的前缀
    },
    fsdomain: {
      prefix: '/order/fs'
    }
  },
  tmsTransaction: false,
  auth: {
    jwt: false,
    redis: {
      prefix: process.env.TMS_REDIS_PREFIX,
      host: process.env.TMS_REDIS_HOST,
      port: parseInt(process.env.TMS_REDIS_PORT),
      expiresIn: parseInt(process.env.TMS_REDIS_EXPIRESIN) || 7200
    }
  },
  tmwConfig: {
    TMS_APP_DEFAULT_CREATETIME: 'TMS_DEFAULT_CREATE_TIME',
    TMS_APP_DEFAULT_UPDATETIME: 'TMS_DEFAULT_UPDATE_TIME',
    TMS_APP_DATA_ACTION_LOG: 'Y'
  }
}

//
const fs = require('fs')
if (fs.existsSync(process.cwd() + "/config/app.local2.js")) Object.assign(appConfig, require(process.cwd() + "/config/app.local2.js"))

module.exports = appConfig