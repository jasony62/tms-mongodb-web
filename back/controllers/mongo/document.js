const { ResultData, ResultFault } = require('tms-koa')
const DocBase = require('../documentBase')
const _ = require('lodash')
const ObjectId = require('mongodb').ObjectId
const ModelColl = require('../../models/mgdb/collection')
const ModelDoc = require('../../models/mgdb/document')
const log4js = require('log4js')
const logger = log4js.getLogger('tms-mongodb-web')

class Document extends DocBase {
  constructor(...args) {
    super(...args)
  }
  /**
   * 上传并导入单个文件
   */
  async uploadToImport() {
    if (!this.request.files || !this.request.files.file) {
      return new ResultFault('没有上传文件')
    }
    const existCl = await this.docHelper.findRequestCl()
    const { UploadPlain } = require('tms-koa/lib/model/fs/upload')
    const { LocalFS } = require('tms-koa/lib/model/fs/local')
    const { FsContext } = require('tms-koa').Context

    const file = this.request.files.file
    const fsContextIns = FsContext.insSync()
    const domain = fsContextIns.getDomain(fsContextIns.defaultDomain)
    const tmsFs = new LocalFS(domain)
    const upload = new UploadPlain(tmsFs)
    let filepath
    try {
      filepath = await upload.store(file, '', 'Y')
    } catch (e) {
      return new ResultFault(e.message)
    }
    // 去重校验
    const { operateRules } = existCl
    let noRepeatConfig = null
    if (operateRules && operateRules.scope && operateRules.scope.unrepeat) {
      const {
        database: { name: dbName },
        collection: { name: clName },
        primaryKeys,
        insert
      } = operateRules.unrepeat
      noRepeatConfig = {
        config: {
          columns: primaryKeys,
          db: dbName,
          cl: clName,
          insert: insert
        }
      }
    }

    let rst = await this.docHelper.importToColl(
      existCl,
      filepath,
      noRepeatConfig
    )

    let result = null
    if (rst[0] === true) {
      result = {
        importAll: true,
        message: `导入成功`
      }
    } else {
      result = {
        importAll: false,
        message: `导入失败,${rst[1]}`
      }
    }
    return new ResultData(result)
  }
  /**
   * 导出数据
   */
  async export() {
    let { filter, docIds, columns } = this.request.body

    let modelDoc = new ModelDoc(this.bucket)

    let query
    if (docIds && docIds.length > 0) {
      // 按选中修改
      let docIds2 = docIds.map(id => new ObjectId(id))
      query = { _id: { $in: docIds2 } }
    } else if (filter && typeof filter === 'object') {
      // 按条件修改
      query = modelDoc.assembleQuery(filter)
    } else if (typeof filter === 'string' && filter === 'ALL') {
      //修改全部
      query = {}
    } else {
      return new ResultFault('没有要导出的数据')
    }

    const existCl = await this.docHelper.findRequestCl()
    // 集合列
    let modelCl = new ModelColl(this.bucket)
    columns = columns ? columns : await modelCl.getSchemaByCollection(existCl)
    if (!columns) return new ResultFault('指定的集合没有指定集合列')

    const client = this.mongoClient
    const { ExcelCtrl } = require('tms-koa/lib/controller/fs')

    // 集合数据
    function buildData(data, columns) {
      let result = {}
      try {
        Object.keys(columns).forEach(column => {
          const config = columns[column]
          if (!data[column] || !data[column].length) {
            result[column] = ''
          } else {
            if (config.type === 'array' && config.enum && config.enum.length) {
              let enums = null
              if (config.enumGroups && config.enumGroups.length) {
                const id = config.enumGroups.find(grop => {
                  const attr = grop.assocEnum.property
                  if (data[attr] == grop.assocEnum.value) return grop
                }).id
                enums = config.enum.filter(item => item.group === id)
              } else {
                enums = config.enum
              }
              let arr = []
              for (let obj of enums) {
                if (data[column].includes(obj.value)) {
                  arr.push(obj.label)
                }
              }
              result[column] = arr.join(',')
            } else if (
              config.type === 'array' &&
              config.items &&
              config.items.format
            ) {
              result[column] = data[column].map(item => item.name).join(',')
            } else if (
              config.type === 'string' &&
              config.enum &&
              config.enum.length
            ) {
              const label = config.enum.find(
                item => item.value === data[column]
              ).label
              if (!label) {
                throw new Error(
                  `字段英文名[${column}],字段值[${data[column]}]找不到对应的中文名`
                )
              } else {
                result[column] = label
              }
            } else {
              result[column] = data[column]
            }
          }
        })
        return [true, result]
      } catch (e) {
        return [false, e.message]
      }
    }
    // let datas = []
    // try {
    //   await client
    //     .db(existCl.db.sysname)
    //     .collection(existCl.sysname)
    //     .find(query)
    //     .forEach(item => {
    //       let [flag, data] = buildData(item, columns)
    //       if (!flag) throw new Error(data)
    //       datas.push(data)
    //       if (datas.length === 30000) return
    //     })
    //   let rst = ExcelCtrl.export(columns, datas, existCl.name + '.xlsx')
    //   if (rst[0] === false) return new ResultFault(rst[1])
    //   return new ResultData(rst[1])
    // } catch (e) {
    //   return new ResultFault(e.message)
    // }
    // 49.30s
    let count = 0,
      num = 0,
      datas = [],
      result = []
    const total = await client
      .db(existCl.db.sysname)
      .collection(existCl.sysname)
      .find(query)
      .count()
    try {
      await client
        .db(existCl.db.sysname)
        .collection(existCl.sysname)
        .find(query)
        .forEach(item => {
          count++
          var [flag, data] = buildData(item, columns)
          if (!flag) throw new Error(data)
          datas.push(data)
          if (datas.length >= 10000) {
            let name = `${existCl.name}(${num})`
            let rst = ExcelCtrl.export(columns, datas, name + '.xlsx')
            if (rst[0] === false) throw new Error(rst[1])
            result.push(rst[1])
            datas.length = 0
            num++
          } else {
            if (total === count) {
              let name = existCl.name
              if (num !== 0) name += `(${num})`
              let rst = ExcelCtrl.export(columns, datas, name + '.xlsx')
              if (rst[0] === false) throw new Error(rst[1])
              result.push(rst[1])
              datas.length = 0
              num++
            }
          }
        })
      return new ResultData(result)
    } catch (e) {
      return new ResultFault(e.message)
    }
  }
  /**
   * 剪切文档到指定集合
   *
   * @execNum 本次最大迁移数
   * @planTotal 总计划迁移数
   * @alreadyMoveTotal 已经迁移的个数
   * @alreadyMovePassTotal 已经迁移成功的个数
   */
  async move() {
    let {
      oldDb,
      oldCl,
      newDb,
      newCl,
      execNum = 100,
      planTotal = 0,
      alreadyMoveTotal = 0,
      alreadyMovePassTotal = 0
    } = this.request.query

    let { docIds, filter } = this.request.body

    if (!filter && (!Array.isArray(docIds) || docIds.length == 0)) {
      return new ResultFault('没有要移动的数据')
    }

    let modelCl = new ModelColl()
    const oldExistCl = await modelCl.byName(oldDb, oldCl)

    let modelDoc = new ModelDoc(this.bucket, this.client)

    let docIds2, oldDocus, total
    if (docIds) {
      total = docIds.length
      docIds2 = docIds
    } else {
      // 按条件
      let query = {}
      if (_.toUpper(filter) !== 'ALL') {
        query = modelDoc.assembleQuery(filter)
      }
      let cl = this.docHelper.findSysColl(oldExistCl)
      oldDocus = await cl
        .find(query)
        .limit(parseInt(execNum))
        .toArray()
      total = await cl.find(query).count()
    }

    let rst = await this.docHelper.cutDocs(
      oldDb,
      oldCl,
      newDb,
      newCl,
      docIds2,
      oldDocus
    )
    if (rst[0] === false) return new ResultFault(rst[1])
    rst = rst[1]

    //
    if (planTotal == 0) planTotal = parseInt(total) // 计划总需要迁移数
    alreadyMoveTotal = parseInt(alreadyMoveTotal) + parseInt(rst.planMoveTotal) // 已经迁移数
    let spareTotal = parseInt(planTotal) - alreadyMoveTotal // 剩余迁移数
    alreadyMovePassTotal =
      parseInt(alreadyMovePassTotal) + parseInt(rst.rstDelOld.result.n) // 已经成功迁移数
    let alreadyMoveFailTotal = alreadyMoveTotal - alreadyMovePassTotal // 已经迁移失败的数量
    let data = {
      planTotal,
      alreadyMoveTotal,
      alreadyMovePassTotal,
      alreadyMoveFailTotal,
      spareTotal
    }

    return new ResultData(data)
  }
}

module.exports = Document
