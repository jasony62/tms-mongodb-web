const ObjectId = require('mongodb').ObjectId
const Base = require('./base')
const log4js = require('log4js')
const logger = log4js.getLogger('tms-xlsx-etd-models')

class Index extends Base {}

module.exports = Index
