import * as CryptoJS from 'crypto-js'
/**
 * AES加解密
 */
export class AES {
  /**
   * 对输入的文本进行加密
   * @param text
   * @param key
   */
  static encrypt(text, key): string {
    let utf8Key = CryptoJS.enc.Utf8.parse(key).toString()

    let encrypted = CryptoJS.AES.encrypt(text, utf8Key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    })

    let result = encrypted.toString()
    return result
  }
  /**
   * 对输入的文本进行解密
   * @param text
   * @param key
   */
  static decrypt(text, key): string {
    let utf8Key = CryptoJS.enc.Utf8.parse(key).toString()
    let decrypted = CryptoJS.AES.decrypt(text, utf8Key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    })

    let result = decrypted.toString(CryptoJS.enc.Utf8)
    return result
  }
}
