const { ResultData, ResultFault } = require('tms-koa')
const Base = require('./base')
const DocumentHelper = require('./documentHelper')
const ModelDoc = require('../models/mgdb/document')
const ObjectId = require('mongodb').ObjectId
const _ = require('lodash')
const APPCONTEXT = require('tms-koa').Context.AppContext
const TMWCONFIG = APPCONTEXT.insSync().appConfig.tmwConfig

class DocBase extends Base {
  constructor(...args) {
    super(...args)
    this.docHelper = new DocumentHelper(this)
    this.modelDoc = new ModelDoc()
  }
  /**
   * 指定数据库指定集合下新建文档
   */
  async create() {
    const existCl = await this.docHelper.findRequestCl()

    const { name: clName } = existCl
    let doc = this.request.body

    // 加工数据
    this.modelDoc.beforeProcessByInAndUp(doc, 'insert')

    return this.docHelper
      .findSysColl(existCl)
      .insertOne(doc)
      .then(async (r) => {
        await this.modelDoc.dataActionLog(
          r.ops,
          '创建',
          existCl.db.name,
          clName
        )
        return new ResultData(doc)
      })
  }
  /**
   * 删除文档
   */
  async remove() {
    const existCl = await this.docHelper.findRequestCl()

    const { id } = this.request.query

    const cl = this.docHelper.findSysColl(existCl)

    if (TMWCONFIG.TMS_APP_DATA_ACTION_LOG === 'Y') {
      // 记录操作日志
      let data = await cl.findOne({
        _id: ObjectId(id),
      })
      await this.modelDoc.dataActionLog(
        data,
        '删除',
        existCl.db.name,
        existCl.name
      )
    }

    return cl
      .deleteOne({
        _id: ObjectId(id),
      })
      .then((result) => new ResultData(result.result))
  }
  /**
   * 指定数据库指定集合下的文档
   */
  async list() {
    const existCl = await this.docHelper.findRequestCl()

    const { page = null, size = null } = this.request.query
    const { filter = null, orderBy = null } = this.request.body

    let data = await this.modelDoc.list(
      existCl,
      { filter, orderBy },
      { page, size }
    )
    if (data[0] === false) return new ResultFault(data[1])

    data = data[1]

    return new ResultData(data)
  }
  /**
   * 批量删除
   */
  async removeMany() {
    let existCl = await this.docHelper.findRequestCl()
    let cl = this.docHelper.findSysColl(existCl)

    let { filter, docIds } = this.request.body

    let find, operate_type
    if (docIds && docIds.length > 0) {
      // 按选中删除
      let docIds2 = []
      docIds.forEach((id) => {
        docIds2.push(new ObjectId(id))
      })

      find = {
        _id: {
          $in: docIds2,
        },
      }
      operate_type = '批量删除(按选中)'
    } else if (typeof filter === 'string' && _.toUpper(filter) === 'ALL') {
      // 清空表
      find = {}
      operate_type = '批量删除(按全部)'
    } else if (typeof filter === 'object') {
      // 按条件删除
      find = this.modelDoc.assembleQuery(filter)
      operate_type = '批量删除(按条件)'
    } else {
      return new ResultData({
        n: 0,
        ok: 0,
      })
    }

    let total = await cl.find(find).count()
    if (total === 0) return new ResultFault('没有数据或不能删除')
    if (TMWCONFIG.TMS_APP_DATA_ACTION_LOG === 'Y') {
      // 记录操作日志
      let datas2 = await cl.find(find).toArray()
      await this.modelDoc.dataActionLog(
        datas2,
        operate_type,
        existCl.db.name,
        existCl.name
      )
    }

    return cl.deleteMany(find).then((result) => new ResultData(result.result))
  }
  /**
   * 更新指定数据库指定集合下的文档
   */
  async update() {
    const existCl = await this.docHelper.findRequestCl()

    const { id } = this.request.query
    let doc = this.request.body
    doc = _.omit(doc, ['_id', 'bucket'])
    // 加工数据
    this.modelDoc.beforeProcessByInAndUp(doc, 'update')

    let cl = this.docHelper.findSysColl(existCl)
    let find = {
      _id: ObjectId(id),
    }

    // 日志
    if (TMWCONFIG.TMS_APP_DATA_ACTION_LOG === 'Y') {
      // 获取原始数据
      let oData = await cl.findOne(find)
      await this.modelDoc.dataActionLog(
        doc,
        '修改',
        existCl.db.name,
        existCl.name,
        '',
        '',
        JSON.stringify(oData)
      )
    }

    return cl
      .updateOne(find, {
        $set: doc,
      })
      .then(() => new ResultData(doc))
  }
  /**
   * 批量修改数据
   */
  async updateMany() {
    const existCl = await this.docHelper.findRequestCl()

    let { docIds, filter, columns } = this.request.body
    if (!columns || Object.keys(columns).length === 0)
      return new ResultFault('没有要修改的列')

    let find
    let logOperate
    if (docIds && docIds.length > 0) {
      // 按选中修改
      let docIds2 = []
      docIds.forEach((id) => {
        docIds2.push(new ObjectId(id))
      })
      find = {
        _id: {
          $in: docIds2,
        },
      }
      logOperate = '批量修改(按选中)'
    } else if (filter && typeof filter === 'object') {
      // 按条件修改
      find = this.modelDoc.assembleQuery(filter)
      logOperate = '批量修改(按条件)'
    } else if (typeof filter === 'string' && filter === 'ALL') {
      //修改全部
      find = {}
      logOperate = '批量修改(按全部)'
    } else {
      return new ResultFault('没有要修改的数据')
    }

    let set = {}
    for (const key in columns) {
      set[key] = columns[key]
    }
    // 加工数据
    this.modelDoc.beforeProcessByInAndUp(set, 'update')
    return this.docHelper
      .findSysColl(existCl)
      .updateMany(find, {
        $set: set,
      })
      .then((rst) => {
        if (TMWCONFIG.TMS_APP_DATA_ACTION_LOG === 'Y') {
          this.modelDoc.dataActionLog(
            {},
            logOperate,
            existCl.db.name,
            existCl.name
          )
        }

        return new ResultData(rst.result)
      })
  }
  /**
   *  根据某一列的值分组
   */
  async getGroupByColumnVal() {
    const existCl = await this.docHelper.findRequestCl()

    let { column, page = null, size = null } = this.request.query
    let { filter } = this.request.body

    let cl = this.docHelper.findSysColl(existCl)

    let find = {}
    if (filter) {
      find = this.modelDoc.assembleQuery(filter)
    }
    let group = [
      {
        $match: find,
      },
      {
        $group: {
          _id: '$' + column,
          num_tutorial: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]
    if (page && page > 0 && size && size > 0) {
      let skip = {
        $skip: (parseInt(page) - 1) * parseInt(size),
      }
      let limit = {
        $limit: parseInt(size),
      }
      group.push(skip)
      group.push(limit)
    }

    return cl
      .aggregate(group)
      .toArray()
      .then((arr) => {
        let data = []
        arr.forEach((a) => {
          let d = {}
          d.title = a._id
          d.sum = a.num_tutorial
          data.push(d)
        })

        return new ResultData(data)
      })
  }
  /**
   * 返回指定文档的完成度
   */
  async getDocCompleteStatusById() {
    const existCl = await this.docHelper.findRequestCl()

    let { docIds } = this.request.body
    if (!Array.isArray(docIds) || docIds.length === 0)
      return new ResultFault('没有要查询的数据')

    const docIds2 = docIds.map((id) => new ObjectId(id))
    const find = { _id: { $in: docIds2 } }

    return this.docHelper
      .findSysColl(existCl)
      .find(find)
      .toArray()
      .then(async (docs) => {
        await this.modelDoc.getDocCompleteStatus(existCl, docs)
        return docs
      })
  }
}

module.exports = DocBase
