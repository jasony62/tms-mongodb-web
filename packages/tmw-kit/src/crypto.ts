import CryptoJS from 'crypto-js'
/**
 * AES加解密
 */
export class AES {
  /**
   * 对输入的文本进行加密
   * @param text
   */
  static encrypt(text): string {
    const CIPHER_KEY = process.env.TMW_APP_DATA_CIPHER_KEY
    if (!CIPHER_KEY) return text

    let utf8Key = CryptoJS.enc.Utf8.parse(CIPHER_KEY).toString()

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
   */
  static decrypt(text): string {
    const CIPHER_KEY = process.env.TMW_APP_DATA_CIPHER_KEY
    if (!CIPHER_KEY) return text
    let utf8Key = CryptoJS.enc.Utf8.parse(CIPHER_KEY).toString()
    let decrypted = CryptoJS.AES.decrypt(text, utf8Key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    })

    let result = decrypted.toString(CryptoJS.enc.Utf8)
    return result
  }
}
