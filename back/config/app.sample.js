let appConfig = {
  name: process.env.TMS_APP_NAME || 'tms-mongodb-web', // 如需自定义可在项目根目录下创建/back/.env文件配置成环境变量
  port: process.env.TMS_APP_PORT || 3000, // 如需自定义可在项目根目录下创建/back/.env文件配置成环境变量
  router: {
    auth: {
      prefix: process.env.TMS_APP_ROUTER_AUTH || 'auth', // 鉴权接口调用url的前缀
    },
    controllers: {
      prefix: process.env.TMS_APP_ROUTER_CONTROLLER || 'api', // 控制器接口调用url的前缀，例如：/api
      plugins_npm: [{ id: 'tms-koa-account', alias: 'account' }], // 账号管理相关接口
    },
    plugins: {
      prefix: process.env.TMS_APP_ROUTER_PLUGIN || 'plugin', // 插件接口调用url的前缀
    },
    fsdomain: {
      prefix: process.env.TMS_APP_ROUTER_FSDOMAIN || 'fs',
    },
  },
  tmsTransaction: false,
  // 鉴权 jwt
  auth: {
    jwt: {
      privateKey: 'tms-mongodb-web',
      expiresIn: 3600,
    },
    // 鉴权 redis  如果鉴权信息要从redis中获取，可在此连接redis需注释上面jwt对象，redis中端口、地址等信息可在项目根目录下创建/back/.env文件配置成环境变量，并且需要在/back/config/文件夹中依据redis.sample.js创建redis.js
    // redis: {
    //   prefix: process.env.TMS_REDIS_PREFIX || "tms-mongodb-web",
    //   host: process.env.TMS_REDIS_HOST || "localhost",
    //   port: parseInt(process.env.TMS_REDIS_PORT) || 6379,
    //   password: process.env.TMS_REDIS_PWD || '',
    //   expiresIn: parseInt(process.env.TMS_REDIS_EXPIRESIN) || 7200
    // },
    // 验证码
    captcha: {
      // 如需自定义验证码，可在项目根目录下创建生成验证码文件，将文件路径命名给path并注释code
      // path: '/auth/captcha.js', // 指定验证码实现方法
      // checkPath: '/auth/checkPath.js' // 指定检查验证码方法
      // code: '1234', // 指定固定验证码
      npm: {
        disabled: false,
        id: 'tms-koa-account',
        module: 'models/captcha',
        checker: 'checkCaptcha',
        generator: "createCaptcha"
      },
    },
    //
    client: {
      // 如需自定义鉴权函数，可在项目根目录下创建鉴权函数, 将文件路径命名给path并注释 accounts
      // path: '/auth/client.js', // 指定用户认证实现方法
      // registerPath: "/auth/register.js" // 指定用户注册的实现方法
      // accounts: [ // 默认用户组
      //   {
      //     id: 1,
      //     username: 'root',
      //     password: 'root',
      //   },
      // ],
      npm: {
        disabled: false,
        id: 'tms-koa-account',
        authentication: 'models/authenticate',
        register: 'models/register',
      },
    },
  },
  tmwConfig: {
    TMS_APP_DEFAULT_CREATETIME:
      process.env.TMS_APP_DEFAULT_CREATETIME || 'TMS_DEFAULT_CREATE_TIME', // 集合中添加、创建、导入数据时默认添加创建时间字段，字段名
    TMS_APP_DEFAULT_UPDATETIME:
      process.env.TMS_APP_DEFAULT_UPDATETIME || 'TMS_DEFAULT_UPDATE_TIME', // 修改集合中文档时默认增加修改时间字段，字段名名
    TMS_APP_DATA_ACTION_LOG: process.env.TMS_APP_DATA_ACTION_LOG || 'N', // 数据操作日志， 日志会记录到tms_admin库下的 tms_app_data_action_log 集合中
  },
}

module.exports = appConfig