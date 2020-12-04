const fs = require('fs')
const path = require('path')
const log4js = require('log4js')
const logger = log4js.getLogger('tms-mongodb-web')

class NativeConfig {
  currentPath(name) {
    let filePath = path.join(__dirname, `${name}.js`)
    if (fs.existsSync(filePath)) {
      logger.info(`从[${filePath}]加载配置`)
      return filePath
    } else {
      logger.warn(`${filePath}文件不存在`)
      return ''
    }
  }
  exec(name, queryParams, postParams) {
    let path = this.currentPath(name)
    if (!path) {
      return false
    }

    let modules = require(path)

    return modules(name, queryParams, postParams)
  }
}

module.exports = NativeConfig
