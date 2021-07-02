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
    jwt: false,
    // 验证码
    captcha: {
      code: process.env.TMS_APP_AUTH_CAPTCHA_CODE || "1234",
    },
    //
    client: {
      accounts: process.env.TMS_APP_AUTH_CLIENT_ACCOUNTS ? JSON.parse(process.env.TMS_APP_AUTH_CLIENT_ACCOUNTS) : [{ id: 1, username: 'admin', password: 'nlpt@189', }]
    },
    redis: {
      prefix: process.env.TMS_REDIS_PREFIX,
      host: process.env.TMS_REDIS_HOST,
      port: parseInt(process.env.TMS_REDIS_PORT),
      password: process.env.TMS_REDIS_PWD || "",
      expiresIn: parseInt(process.env.TMS_REDIS_EXPIRESIN) || 7200
    },
  },
  tmwConfig: {
    TMS_APP_DEFAULT_CREATETIME: process.env.TMS_APP_DEFAULT_CREATETIME || 'TMS_DEFAULT_CREATE_TIME', // 集合中添加、创建、导入数据时默认添加创建时间字段，字段名
    TMS_APP_DEFAULT_UPDATETIME: process.env.TMS_APP_DEFAULT_UPDATETIME || 'TMS_DEFAULT_UPDATE_TIME', // 修改集合中文档时默认增加修改时间字段，字段名名
    TMS_APP_DB_CREATETIME: process.env.TMS_APP_DB_CREATETIME || 'TMS_DEFAULT_DB_CREATE_TIME', // 
    TMS_APP_DB_UPDATETIME: process.env.TMS_APP_DB_UPDATETIME || 'TMS_DEFAULT_DB_UPDATE_TIME', // 
    TMS_APP_DATA_ACTION_LOG: 'Y', // 数据操作日志， 日志会记录到tms_admin库下的 tms_app_data_action_log 集合中
  }
}