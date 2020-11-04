// 如需使用自动化配置，env环境中需要配置白名单的命名方式应为，以TRUSTIPS_ + 接口对应路径 + '_IPS_' 开头；如要访问mongo/db下的接口，则命名TRUSTIPS_MONGO_DB_IPS***
// 对环境变量中前缀为TRUSTIPS_的ip统一处理
let manualSetIps = {},
  autoSetIps = {}
const keys = Object.keys(process.env)
const reg = /^TRUSTIPS_(\w+)_IPS/
keys.forEach(key => {
  if (!reg.test(key)) return
  const str = key.match(reg)[1]
  let ctrlName = ''
  str
    .split('_')
    .filter(prop => prop)
    .forEach(item => {
      ctrlName += item.toLowerCase() + '/'
    })
  const prop = ctrlName.slice(0, -1)
  autoSetIps[prop] = JSON.parse(process.env[key])
})

module.exports = {
  ...autoSetIps,
  ...manualSetIps
}
