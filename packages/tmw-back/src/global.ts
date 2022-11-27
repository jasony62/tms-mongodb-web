import * as path from 'path'
import * as fs from 'fs'

let TMW_CONFIG
let cnfpath = path.resolve(process.cwd() + '/config/app.js')
if (fs.existsSync(cnfpath)) {
  TMW_CONFIG = require(process.cwd() + '/config/app').tmwConfig
} else {
  TMW_CONFIG = {
    TMW_APP_CREATETIME: 'TMW_CREATE_TIME',
    TMW_APP_UPDATETIME: 'TMW_UPDATE_TIME',
    TMW_APP_TAGS: 'TMW_TAGS',
    TMW_APP_DATA_ACTION_LOG: 'N',
  }
}

export { TMW_CONFIG }
