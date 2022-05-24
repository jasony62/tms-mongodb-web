
import cryptoJs from 'crypto-js'
// 加密方法

export function aesEncrypt(string: any, key: any): string | null{
  key = key + 'adc'
  key = cryptoJs.enc.Utf8.parse(key); // 十六位十六进制数作为密钥
  let rst = cryptoJs.AES.encrypt(string, key, {
    mode: cryptoJs.mode.ECB,
    padding: cryptoJs.pad.Pkcs7
  })
  return rst.toString()
}