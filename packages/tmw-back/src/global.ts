import * as path from 'path'
import * as fs from 'fs'

let TMW_CONFIG
let cnfpath = path.resolve(process.cwd() + '/config/app.js')
if (fs.existsSync(cnfpath)) {
  TMW_CONFIG = require(process.cwd() + '/config/app').tmwConfig
} else {
  TMW_CONFIG = {
    TMW_APP_DEFAULT_CREATETIME: 'TMW_DEFAULT_CREATE_TIME',
    TMW_APP_DEFAULT_UPDATETIME: 'TMW_DEFAULT_UPDATE_TIME',
    TMW_APP_DATA_ACTION_LOG: 'N',
  }
}

export { TMW_CONFIG }
