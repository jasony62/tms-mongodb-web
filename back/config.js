let fs = require('fs')

let ctrlPath = process.cwd() + "/config/config.js"
let configCus = {}
if (fs.existsSync(ctrlPath)) {
    configCus = require('./config/config')
}

let config = {}
config.APP_PROTOCOL = (configCus.APP_PROTOCOL) ? configCus.APP_PROTOCOL : 'http://'
config.APP_HTTP_HOST = (configCus.APP_HTTP_HOST) ? configCus.APP_HTTP_HOST : 'localhost'

//集合中添加、创建、导入数据时默认添加时间字段，字段名
config.TMS_APP_DEFAULT_CREATETIME = (configCus.TMS_APP_DEFAULT_CREATETIME) ? configCus.TMS_APP_DEFAULT_CREATETIME : 'TMS_DEFAULT_CREATE_TIME'
// 修改集合中文档时默认增加 修改时间字段，字段名名
config.TMS_APP_DEFAULT_UPDATETIME = (configCus.TMS_APP_DEFAULT_UPDATETIME) ? configCus.TMS_APP_DEFAULT_UPDATETIME : 'TMS_DEFAULT_UPDATE_TIME'

// 数据操作日志， 日志会记录到tms_admin库下的 tms_app_data_action_log 集合中
config.TMS_APP_DATA_ACTION_LOG = (configCus.TMS_APP_DATA_ACTION_LOG) ? configCus.TMS_APP_DATA_ACTION_LOG : 'N'


module.exports = config