// 解密方法
function unencryption(ctx) {
  const CryptoJS = require('crypto-js')
  const authDecode = (string, key) => {
    key = CryptoJS.enc.Utf8.parse(key) // 十六位十六进制数作为密钥
    let rst = CryptoJS.AES.decrypt(string, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    })
    return rst.toString(CryptoJS.enc.Utf8)
  }
  const getPwd = (pwd) => {
    CryptoJS.MD5(pwd).toString()
  }

  let { username, password } = ctx.request.body
  if (ctx.request.query.adc) {
    const authEncryKey = ctx.request.query.adc + 'adc'
    if (authEncryKey.length !== 16) {
      return Promise.reject('参数错误2')
    }
    username = authDecode(username, authEncryKey)
    password = authDecode(password, authEncryKey)
  }
  //模拟前端加密
  // password = getPwd(password)

  return { username, password }
}
module.exports = { unencryption }
