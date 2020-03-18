let appConfig = {
  name: process.env.TMS_APP_NAME || "tms-mongodb-web",
  port: process.env.TMS_APP_PORT || 3000,
  router: {
    auth: {
      prefix: 'auth' // 鉴权接口调用url的前缀
    },
    controllers: {
      prefix: 'api' // 控制器接口调用url的前缀，例如：/api
    },
    plugins: {
      prefix: 'plugin' // 插件接口调用url的前缀
    }
  },
  tmsTransaction: false,

  // 鉴权 jwt
  auth: {
    jwt: {
      privateKey: "tms-mongodb-web",
      expiresIn: 3600
    },
    // 鉴权 redis  如果鉴权信息要从redis中获取，可在此连接redis需注释上面jwt对象，redis中端口、地址等信息可在启动目录下.env文件中配置成环境变量
    // redis: {
    //   prefix: process.env.TMS_REDIS_PREFIX || "tms-mongodb-web",
    //   host: process.env.TMS_REDIS_HOST || "localhost",
    //   port: parseInt(process.env.TMS_REDIS_PORT) || 6379,
    //   expiresIn: parseInt(process.env.TMS_REDIS_EXPIRESIN) || 7200
    // },
    // 验证码
    captcha: {
      // 如需自定义验证码，可在启动目录下创建生成验证码文件，将文件路径命名给path并注释code
      // path: "/auth/captcha.js"
      code: "1234"
    },
    // 
    client: {
      // 如需自定义鉴权函数，可在启动目录下创建鉴权函数, 将文件路径命名给path并注释 accounts
      // path: "/auth/client.js"
      accounts: [
        {
          id: 1,
          username: "root",
          password: "root"
        }
      ]
    }
  }
}

//
const fs = require('fs')
if (fs.existsSync(process.cwd() + "/config/app.local.js")) Object.assign(appConfig, require(process.cwd() + "/config/app.local.js"))

module.exports = appConfig
