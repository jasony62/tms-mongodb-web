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
      plugins_npm: [
        {
          disabled: false,
          id: 'tms-koa-account',
          dir: 'dist/controllers',
          alias: 'account',
        },
      ],
    },
    plugins: {
      prefix: env.TMW_APP_ROUTER_PLUGIN || 'plugin', // 插件接口调用url的前缀
    },
    fsdomain: {
      prefix: env.TMW_APP_ROUTER_FSDOMAIN || 'fs', // 文件下载地址前缀
    },
  },
  cors: {
    credentials: true,
  },
  auth: {
    // 内置账号
    client: {
      npm: {
        disabled: /true|yes/i.test(env.TMW_APP_AUTH_CLIENT_DISABLED),
        id: 'tms-koa-account/dist/models',
        authentication: 'authenticate.js',
        register: 'register',
      },
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
        id: 'tms-koa-captcha',
        module: 'dist/index.js',
        checker: 'checkCaptcha',
        generator: 'createCaptcha',
      },
    },
  },
  tmwConfig: {
    TMW_APP_CREATETIME: env.TMW_APP_CREATETIME || 'TMW_CREATE_TIME', // 集合中添加、创建、导入数据时默认添加创建时间字段，字段名
    TMW_APP_UPDATETIME: env.TMW_APP_UPDATETIME || 'TMW_UPDATE_TIME', // 修改集合中文档时默认增加修改时间字段，字段名名
    TMW_APP_DATA_ACTION_LOG: env.TMW_APP_DATA_ACTION_LOG || 'N', // 数据操作日志， 日志会记录到tms_admin库下的 tms_app_data_action_log 集合中
    TMW_APP_TAGS: env.TMW_APP_TAGS || 'TMW_TAGS', // 默认的数据标签字段
  },
  body: {
    jsonLimit: env.TMW_APP_BODY_JSON_LIMIT || '1mb',
  },
}

export default appConfig
