let appConfig = {
  port: process.env.TMS_APP_PORT || 3000,
  name: 'dev-op',
  router: {
    auth: {
      prefix: '/pool/auth' // 接口调用url的前缀
    },
    controllers: {
      prefix: '/pool/api' // 接口调用url的前缀，例如：/api
    },
    plugins: {
      prefix: '/pool/plugin' // 接口调用url的前缀
    },
    fsdomain: {
      prefix: '/pool/fs'
    }
  },
  tmsTransaction: false,
  auth: {
    jwt: {
      privateKey: "tms-mongodb-web",
      expiresIn: 3600,
    },
    // 验证码
    captcha: {
      // 如需自定义验证码，可在项目根目录下创建生成验证码文件，将文件路径命名给path并注释code
      // path: "files"
      code: "1234",
    },
    // 
    client: {
      // 如需自定义鉴权函数，可在项目根目录下创建鉴权函数, 将文件路径命名给path并注释 accounts
      // path: "files"
      accounts: [ // 默认用户组
        {
          id: 1,
          username: 'root',
          password: 'root',
        },
        {
          id: 2,
          username: 'user1',
          password: 'user1',
        },
      ],
    },
  },
  tmwConfig: {
    TMS_APP_DEFAULT_CREATETIME: 'TMS_DEFAULT_CREATE_TIME', // 集合中添加、创建、导入数据时默认添加创建时间字段，字段名
    TMS_APP_DEFAULT_UPDATETIME: 'TMS_DEFAULT_UPDATE_TIME', // 修改集合中文档时默认增加修改时间字段，字段名名
    TMS_APP_DATA_ACTION_LOG: 'Y' // 数据操作日志， 日志会记录到tms_admin库下的 tms_app_data_action_log 集合中
  }
}

module.exports = appConfig
