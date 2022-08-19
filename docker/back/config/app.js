const { env } = process
let appConfig = {
  name: env.TMW_APP_NAME || 'tms-mongodb-web',
  port: env.TMW_APP_PORT || 3000,
  router: {
    auth: {
      prefix: env.TMW_APP_ROUTER_AUTH || 'auth', // 鉴权接口调用url的前缀
    },
    controllers: {
      prefix: env.TMW_APP_ROUTER_CONTROLLER || 'api', // 控制器接口调用url的前缀，例如：/api
    },
    plugins: {
      prefix: env.TMW_APP_ROUTER_PLUGIN || 'plugin', // 插件接口调用url的前缀
    },
  },
  cors: {
    credentials: true,
  },
  auth: {
    // 内置账号
    client: {
      accounts: [{ id: 1, username: 'admin', password: 'admin' }],
    },
    // 保存鉴权信息
    jwt: {
      privateKey:
        env.TMW_APP_AUTH_JWT_KEY ||
        `TMW${Date.now()}${parseInt(Math.random() * 100)}`,
      expiresIn: parseInt(env.TMW_APP_AUTH_JWT_EXPIRESIN) || 3600,
    },
    // 验证码
    captcha: {
      npm: {
        disabled: /true|yes/i.test(env.TMW_APP_AUTH_CAPTCHA_DISABLED),
        id: 'tms-koa-account',
        module: 'models/captcha',
        checker: 'checkCaptcha',
        generator: 'createCaptcha',
      },
    },
  },
  tmwConfig: {
    TMW_APP_DEFAULT_CREATETIME:
      env.TMS_APP_DEFAULT_CREATETIME || 'TMW_DEFAULT_CREATE_TIME', // 集合中添加、创建、导入数据时默认添加创建时间字段，字段名
    TMW_APP_DEFAULT_UPDATETIME:
      env.TMS_APP_DEFAULT_UPDATETIME || 'TMW_DEFAULT_UPDATE_TIME', // 修改集合中文档时默认增加修改时间字段，字段名名
    TMW_APP_DATA_ACTION_LOG: env.TMW_APP_DATA_ACTION_LOG || 'N', // 数据操作日志， 日志会记录到tms_admin库下的 tms_app_data_action_log 集合中
  },
}

module.exports = appConfig
