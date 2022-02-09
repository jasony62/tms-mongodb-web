let manualSetIps = {},
  autoSetIps = {}
const keys = Object.keys(process.env)
const reg = /^TRUSTIPS_(\w+)_IPS/

keys.forEach((key) => {
  if (!reg.test(key)) return
  const str = key.match(reg)[1]
  let ctrlName = ''
  str
    .split('_')
    .filter((prop) => prop)
    .forEach((item) => {
      ctrlName += item.toLowerCase() + '/'
    })
  const prop = ctrlName.slice(0, -1)
  autoSetIps[prop] = JSON.parse(process.env[key])
})

module.exports = {
  ...autoSetIps,
  ...manualSetIps,
}
