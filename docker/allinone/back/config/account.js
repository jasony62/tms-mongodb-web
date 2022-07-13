module.exports = {
  disabled: false,
  mongodb: {
    disabled: false,
    name: 'master',
    database: process.env.TMS_ACCOUNT_DBNAME || 'tms_account',
    collection: process.env.TMS_ACCOUNT_CLNAME || 'account',
    schema: { test: { type: 'string', title: '测试' } },
  },
  redis: {
    disabled: false,
    name: 'master',
  },
  authConfig: {
    pwdErrMaxNum: 5, // int 密码错误次数限制 0 不限制
    authLockDUR: 20, // int 登录锁定时长 （秒）
    pwdStrengthCheck: {
      min: 8, // 密码最小长度
      max: 20, // 密码最大长度
      pwdBlack: ['P@ssw0rd'], // 密码黑名单
      containProjects: {
        mustCheckNum: 3,
        contains: ['digits', 'uppercase', 'lowercase', 'symbols'],
      }, // 是否包含数字、大写字母、小写字母、特殊字符, 至少满足其中length项
      hasSpaces: false, // 是否包含空格
      hasAccount: false,
      hasKeyBoardContinuousChar: false,
      // hasKeyBoardContinuousCharSize: 4
    },
  },
  captchaConfig: {},
}