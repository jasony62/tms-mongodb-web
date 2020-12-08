const ObjectId = require('mongodb').ObjectId
const Base = require('./base')
const ModelColl = require('./collection')
const moment = require('moment')
const APPCONTEXT = require('tms-koa').Context.AppContext
const TMWCONFIG = APPCONTEXT.insSync().appConfig.tmwConfig

class Document extends Base {
  /**
   * 模糊搜索数据
   * @param {object} existCl
   * @param {object} [options={}]
   * @param {object} [options.filter]
   * @param {object} [options.orderBy]
   * @param {object} [page={}]
   * @param {number} [page.page]
   * @param {number} [page.size]
   * @param {boolean} [like=true]
   *
   * @returns {[]}
   */
  async list(
    existCl,
    { filter, orderBy } = {},
    { page, size } = {},
    like = true
  ) {
    let query = filter ? this.assembleQuery(filter, like) : {}

    const client = await this.mongoClient()
    let cl = client.db(existCl.db.sysname).collection(existCl.sysname)

    // 分页
    let skip = 0
    let limit = 0
    if (page && page > 0 && size && size > 0) {
      skip = (parseInt(page) - 1) * parseInt(size)
      limit = parseInt(size)
    }
    // 排序
    let sort = {}
    if (orderBy && typeof orderBy === 'object' && Object.keys(orderBy).length) {
      for (const key in orderBy) sort[key] = orderBy[key] === 'desc' ? -1 : 1
    } else {
      sort._id = -1
    }

    let data = {}
    data.docs = await cl
      .find(query)
      .skip(skip)
      .limit(limit)
      .sort(sort)
      .toArray()
      .then(async (docs) => {
        await this.getDocCompleteStatus(existCl, docs)
        return docs
      })

    data.total = await cl.find(query).count()

    return [true, data]
  }
  /**
   * 根据指定的id数组，获得文档列表
   * @param {object} existCl - 文档所在集合
   * @param {string[]} ids - 文档id数组
   * @param {object} [fields={}] - 要显示的列
   *
   * @returns {[]} 第1位：是否成功，第2位：错误信息或文档列表
   */
  async byIds(existCl, ids, fields = {}) {
    if (!existCl || !ids) return [false, '参数不完整']

    let docIds = ids.map((id) => new ObjectId(id))
    let query = { _id: { $in: docIds } }

    const client = await this.mongoClient()
    const cl = client.db(existCl.db.sysname).collection(existCl.sysname)

    return cl
      .find(query)
      .project(fields)
      .toArray()
      .then((rst) => [true, rst])
      .catch((err) => [false, err.toString()])
  }
  /**
   * 记录数据操作日志
   */
  async dataActionLog(
    oDatas,
    operate_type,
    dbname,
    clname,
    operate_after_dbname = '',
    operate_after_clname = '',
    operate_before_data = ''
  ) {
    if (!operate_type || !dbname || !clname) return false
    if (TMWCONFIG.TMS_APP_DATA_ACTION_LOG !== 'Y') return true
    if (dbname === 'tms_admin' && clname === 'tms_app_data_action_log')
      return false

    // 避免改变原数据
    let datas = JSON.parse(JSON.stringify(oDatas))

    if (!Array.isArray(datas)) {
      let dArr = []
      dArr.push(datas)
      datas = dArr
    }

    const client = await this.mongoClient()
    const cl = client.db('tms_admin')
    //         // 检查日志表是否存在
    //         let table = await cl.listCollections({ name: "tms_app_data_action_log"}, { nameOnly: true }).toArray()
    //         if (table.length === 0) { // 创建集合
    //             let rst = await cl.createCollection(info.name)
    //         }

    // 插入日志表中
    let today = moment()
    let current = today.format('YYYY-MM-DD HH:mm:ss')
    const cl2 = cl.collection('tms_app_data_action_log')
    if (operate_before_data && Array.isArray(operate_before_data)) {
      let newDatas = {}
      operate_before_data.forEach((od) => {
        newDatas[od._id] = od
      })
      operate_before_data = newDatas
    }
    //
    for (const data of datas) {
      if (data._id) {
        data.operate_id = data._id
        delete data._id
      } else {
        data.operate_id = ''
      }
      data.operate_dbname = dbname
      data.operate_clname = clname
      data.operate_after_dbname = operate_after_dbname
      data.operate_after_clname = operate_after_clname
      data.operate_time = current
      data.operate_type = operate_type
      // 旧数据
      if (operate_before_data) {
        if (
          typeof operate_before_data === 'object' &&
          operate_before_data[data.operate_id]
        ) {
          data.operate_before_data = JSON.stringify(
            operate_before_data[data.operate_id]
          )
        } else if (typeof operate_before_data === 'string') {
          data.operate_before_data = operate_before_data
        }
      } else {
        data.operate_before_data = ''
      }

      await cl2.insertOne(data)
    }

    return true
  }
  /**
   * 查询文档完成情况
   */
  async getDocCompleteStatus(existCl, docs) {
    const modelCl = new ModelColl()
    const clSchemas = await modelCl.getSchemaByCollection(existCl)
    if (!clSchemas) return docs
    //
    docs.forEach((doc) => {
      let status = {
        unCompleted: {},
        completed: {},
      }
      for (const k in clSchemas) {
        const v = clSchemas[k]
        if (v.required === true) {
          // 必填
          if ([undefined, '', null].includes(doc[k])) status.unCompleted[k] = v
          else status.completed[k] = v
        } else status.completed[k] = v
      }
      doc.completeStatus = status
    })

    return docs
  }
}

module.exports = Document
