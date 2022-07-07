module.exports = {
  disabled: false,
  mongodb: {
    disabled: false,
    name: 'master',
    database: 'tms_account',
    collection: 'account',
    schema: { "test": { type: 'string', title: '测试' } }, //
  },
  redis: {
    disabled: false,
    name: 'master'
  },
  accountBeforeEach: (ctx) => {
    // 不开启密码验证时需注释
    const { decodeAccountV1 } = require('tms-koa-account/models/crypto')
    const rst = decodeAccountV1(ctx)
    if (rst[0] === false)
      return Promise.reject(rst[1])
    return Promise.resolve({ username: rst[1].username, password: rst[1].password })
  },
  authConfig: {
    pwdErrMaxNum: 5, // int 密码错误次数限制 0 不限制
    authLockDUR: 20,   // int 登录锁定时长 （秒）
    pwdStrengthCheck: {
      min: 8, // 密码最小长度
      max: 20, // 密码最大长度
      pwdBlack: ["P@ssw0rd"], // 密码黑名单
      containProjects: { mustCheckNum: 3, contains: ["digits", "uppercase", "lowercase", "symbols"] }, // 是否包含数字、大写字母、小写字母、特殊字符, 至少满足其中length项
      hasSpaces: false, // 是否包含空格
      hasAccount: false,
      hasKeyBoardContinuousChar: false,
      // hasKeyBoardContinuousCharSize: 4
    }
  },
  captchaConfig: {

  }
}