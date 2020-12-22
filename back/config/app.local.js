module.exports = {
  port: process.env.TMS_APP_PORT || 3000,
  name: process.env.TMS_APP_NAME || 'tms-oauth',
  router: {
    auth: {
      prefix: process.env.TMS_APP_ROUTER_AUTH || "auth" // 接口调用url的前缀
    },
    controllers: {
      prefix: process.env.TMS_APP_ROUTER_CONTROLLER || "api" // 接口调用url的前缀
    },
    fsdomain: {
      prefix: process.env.TMS_APP_ROUTER_FSDOMAIN || 'fs', // 文件下载服务的前缀
    },
  },
  auth: {
    jwt: {
      privateKey: process.env.TMS_APP_AUTH_PRIVATEKEY || 'tms-mongodb-web',
      expiresIn: process.env.TMS_APP_AUTH_EXPIRESIN || 3600,
    },
    // 验证码
    captcha: {
      code: process.env.TMS_APP_AUTH_CAPTCHA_CODE || "1234",
    },
    //
    client: {
      accounts: process.env.TMS_APP_AUTH_CLIENT_ACCOUNTS ? JSON.parse(process.env.TMS_APP_AUTH_CLIENT_ACCOUNTS) : [{ id: 1, username: 'admin', password: 'nlpt@189', }]
    },
    // redis: {
    //   prefix: process.env.TMS_REDIS_PREFIX,
    //   host: process.env.TMS_REDIS_HOST,
    //   port: parseInt(process.env.TMS_REDIS_PORT),
    //   expiresIn: parseInt(process.env.TMS_REDIS_EXPIRESIN) || 7200
    // },
    // accessToken: {
    //   structure: "./config/createToken.js"
    // },
    // bucket: {
    //   validator: "./config/bucketCheck.js"
    // },
    // accessToken: {
    //   multiLoginValidator: "./config/multiLoginValidator.js"
    // }
  },
  tmwConfig: {
    TMS_APP_DEFAULT_CREATETIME: process.env.TMS_APP_DEFAULT_CREATETIME || 'TMS_DEFAULT_CREATE_TIME', // 集合中添加、创建、导入数据时默认添加创建时间字段，字段名
    TMS_APP_DEFAULT_UPDATETIME: process.env.TMS_APP_DEFAULT_UPDATETIME || 'TMS_DEFAULT_UPDATE_TIME', // 修改集合中文档时默认增加修改时间字段，字段名名
    TMS_APP_DB_CREATETIME: process.env.TMS_APP_DB_CREATETIME || 'TMS_DEFAULT_DB_CREATE_TIME', // 
    TMS_APP_DB_UPDATETIME: process.env.TMS_APP_DB_UPDATETIME || 'TMS_DEFAULT_DB_UPDATE_TIME', // 
    TMS_APP_DATA_ACTION_LOG: 'Y', // 数据操作日志， 日志会记录到tms_admin库下的 tms_app_data_action_log 集合中
    //
    APP_PASSWORD_ERROR_MAXNUM: process.env.TMS_APP_PASSWORD_ERROR_MAXNUM ? parseInt(process.env.TMS_APP_PASSWORD_ERROR_MAXNUM) : 0, //密码错误次数限制
    APP_PASSWORD_ERROR_AUTHLOCK_EXPIRE: process.env.TMS_APP_PASSWORD_ERROR_AUTHLOCK_EXPIRE ? parseInt(process.env.TMS_APP_PASSWORD_ERROR_AUTHLOCK_EXPIRE) : 10,   // 密码错误超限后锁定时长 （分钟）
    LOGIN_MASTER_VERIFY_CODE: process.env.TMS_APP_LOGIN_MASTER_VERIFY_CODE || null,   // 万能验证码
    APP_AUTH_HTTPS_CHECK: process.env.TMS_APP_AUTH_HTTPS_CHECK ? parseInt(process.env.TMS_APP_AUTH_HTTPS_CHECK) : 0,   // 身份验证检测标准 0 不检查， 1 检查(登录注册页只能由https协议打开，登录注册处理函数只接受来自https的请求)
    APP_AUTH_VERIFYCODE_CHECK: process.env.TMS_APP_AUTH_VERIFYCODE_CHECK ? parseInt(process.env.TMS_APP_AUTH_VERIFYCODE_CHECK) : 1,   // 是否启用验证码 1 启用 0 不启用
    APP_PASSWORD_STRENGTH_CHECK: process.env.TMS_APP_PASSWORD_STRENGTH_CHECK ? parseInt(process.env.TMS_APP_PASSWORD_STRENGTH_CHECK) : 1, //是否判断密码强度 0 不检查， 1 检查
    APP_PASSWORD_BLACKLIST: process.env.TMS_APP_PASSWORD_BLACKLIST ? JSON.parse(process.env.TMS_APP_PASSWORD_BLACKLIST) : ["P@ssw0rd"], //是否判断密码强度 0 不检查， 1 检查
  }
}