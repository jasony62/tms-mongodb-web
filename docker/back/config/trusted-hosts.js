// const Rules = {}

// const RegRule = /^TRUSTIPS_(\w+)_RES/

// Object.keys(process.env).forEach((envName) => {
//   if (!RegRule.test(envName)) return

//   let ctrlNameStr = envName.match(RegRule)[1]

//   let ctrlName = ctrlNameStr.toLowerCase().replace(/_/g, '/')
//   try {
//     Rules[ctrlName] = JSON.parse(process.env[envName])
//   } catch (e) {
//     console.log('解析可信任主机列表配置发生错误，原因：' + e.message)
//   }
// })

export default {
  // ...Rules,
  a: 1,
}
