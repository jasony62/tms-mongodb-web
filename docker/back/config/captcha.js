const { env } = process

module.exports = {
  disabled: /true|yes/i.test(env.TMW_APP_AUTH_CAPTCHA_DISABLED), // boolean 是否启用验证码
  storageType: env.TMW_APP_AUTH_CAPTCHA_STORAGE || 'lowdb', // 验证码存储方式  lowdb | redis
  redisName: env.TMW_APP_AUTH_CAPTCHA_REDIS_NAME || 'master', // 如果使用redis存储验证码，使用redis连接名称
  masterCaptcha: 'aabb', // string 万能验证码
  codeSize: 4, //验证码长度  默认4
  alphabetType: 'number,upperCase,lowerCase', // 字母表生产类型 默认 数字+大写字母+小写字母
  alphabet: '1234567890', // 与alphabetType不可公用，优先级大于alphabetType
  expire: 300, // 过期时间 s 默认300
}
