const { ResultData, ResultFault } = require('tms-koa')
const Base = require('./base')
const DocumentHelper = require('./documentHelper')
const fs = require('fs')
const modelBase = require('../models/mgdb/base')
const modelColl = require('../models/mgdb/collection')
const modelDocu = require('../models/mgdb/document')
const ObjectId = require('mongodb').ObjectId
const _ = require('lodash')
const { unrepeatByArray } = require('../tms/utilities')
const APPCONTEXT = require('tms-koa').Context.AppContext
const TMWCONFIG = APPCONTEXT.insSync().appConfig.tmwConfig
const log4js = require('log4js')
const logger = log4js.getLogger('tms-mongodb-web')

class DocBase extends Base {
  constructor(...args) {
    super(...args)
    this.docHelper = new DocumentHelper(this)
  }
  /**
   * 指定数据库指定集合下新建文档
   */
  async create() {
    const existDb = await this.docHelper.findRequestDb()

    const { cl: clName } = this.request.query
    let doc = this.request.body
    // 加工数据
    this._beforeProcessByInAndUp(doc, 'insert')

    return this.mongoClient
      .db(existDb.sysname)
      .collection(clName)
      .insertOne(doc)
      .then(async (r) => {
        let modelD = new modelDocu()
        await modelD.dataActionLog(r.ops, '创建', existDb.name, clName)
        return new ResultData(doc)
      })
  }
  /**
   * 对插入到表中的数据进行加工
   */
  _beforeProcessByInAndUp(data, type) {
    let model = new modelBase()
    model._beforeProcessByInAndUp(data, type)

    return data
  }
  /**
   *
   */
  async remove() {
    const existDb = await this.docHelper.findRequestDb()

    const { cl: clName, id } = this.request.query
    const cl = this.mongoClient.db(existDb.sysname).collection(clName)

    if (TMWCONFIG.TMS_APP_DATA_ACTION_LOG === 'Y') {
      // 记录操作日志
      let data = await cl.findOne({
        _id: ObjectId(id),
      })
      let modelD = new modelDocu()
      await modelD.dataActionLog(data, '删除', existDb.name, clName)
    }

    return cl
      .deleteOne({
        _id: ObjectId(id),
      })
      .then((result) => new ResultData(result.result))
  }
  /**
   *  根据某一列的值分组
   */
  async getGroupByColumnVal() {
    const existDb = await this.docHelper.findRequestDb()

    let { cl: clName, column, page = null, size = null } = this.request.query
    let { filter } = this.request.body

    const client = this.mongoClient
    let cl = client.db(existDb.sysname).collection(clName)

    if (this.client && this.client.data && this.client.data.rid === 1) {
      if (!filter) filter = {}
      filter.account = {
        keyword: [this.client.data.account],
        feature: 'in',
      }
    }

    let find = {}
    if (filter) {
      find = this._assembleFind(filter)
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
   * 指定数据库指定集合下的文档
   */
  async list() {
    const existDb = await this.docHelper.findRequestDb()

    const { cl: clName, page = null, size = null } = this.request.query
    const { filter = null, orderBy = null } = this.request.body

    let options = {
      filter,
      orderBy,
    }
    let model = new modelDocu()
    let data = await model.listDocs(existDb, clName, options, page, size)
    if (data[0] === false) {
      return new ResultFault(data[1])
    }
    data = data[1]

    return new ResultData(data)
  }
  /**
   * 组装 查询条件
   */
  _assembleFind(filter, like = true) {
    let model = new modelBase()
    return model._assembleFind(filter, like)
  }
  /**
   * 批量删除
   */
  async removeMany(ctx, cl = null, existDb = null, docIds = null) {
    let filter, clName
    if (!cl && !docIds) {
      filter = this.request.body.filter
      clName = this.request.query.cl
      existDb = await this.docHelper.findRequestDb()
    }

    docIds = docIds || this.request.body.docIds
    cl = cl || this.mongoClient.db(existDb.sysname).collection(clName)

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
      find = this._assembleFind(filter)
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
      let modelD = new modelDocu()
      await modelD.dataActionLog(datas2, operate_type, existDb.name, clName)
    }

    return cl.deleteMany(find).then((result) => new ResultData(result.result))
  }
  /**
   * 更新指定数据库指定集合下的文档
   */
  async update() {
    const existDb = await this.docHelper.findRequestDb()

    const { cl: clName, id } = this.request.query
    let doc = this.request.body
    doc = _.omit(doc, ['_id', 'bucket'])
    // 加工数据
    this._beforeProcessByInAndUp(doc, 'update')

    let cl = this.mongoClient.db(existDb.sysname).collection(clName)
    let find = {
      _id: ObjectId(id),
    }

    // 日志
    if (TMWCONFIG.TMS_APP_DATA_ACTION_LOG === 'Y') {
      // 获取原始数据
      let oData = await cl.findOne(find)
      let modelD = new modelDocu()
      await modelD.dataActionLog(
        doc,
        '修改',
        existDb.name,
        clName,
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
   *  剪切数据到指定集合中
   */
  async cutDocs(
    oldExistDb,
    oldCl,
    newExistDb,
    newCl,
    docIds = null,
    options = {},
    oldDocus = null
  ) {
    //获取指定集合的列
    let newClSchema = await modelColl.getSchemaByCollection(newExistDb, newCl)
    if (!newClSchema) return [false, '指定的集合未指定集合列']

    // 查询获取旧数据
    let fields = {}
    if (!oldDocus || oldDocus.length === 0) {
      if (!docIds || docIds.length === 0) return [false, '没有要移动的数据']
      oldDocus = await modelDocu.getDocumentByIds(
        oldExistDb,
        oldCl,
        docIds,
        fields
      )
      if (oldDocus[0] === false) return [false, oldDocus[1]]
      oldDocus = oldDocus[1]
    }

    // 插入到指定集合中,补充没有的数据
    let newDocs = oldDocus.map((doc) => {
      let newd = {
        _id: doc._id,
      }
      for (const k in newClSchema) {
        if (!doc[k]) {
          //存在默认值
          newd[k] = newClSchema[k].default || ''
        } else {
          newd[k] = doc[k]
        }
      }
      return newd
    })

    // 需要插入的总数量
    let planMoveTotal = newDocs.length
    // 插件
    let { transforms } = options
    if (typeof transforms === 'string' && transforms.length !== 0) {
      let transforms2 = transforms.split(',')
      if (fs.existsSync(process.cwd() + '/config/plugins.js')) {
        let plugins = require(process.cwd() + '/config/plugins')
        let moveTransformDoc = _.get(plugins, 'document.transforms.move')
        if (moveTransformDoc && Array.isArray(moveTransformDoc)) {
          for (const tf of moveTransformDoc) {
            //
            if (!transforms2.includes(tf.name)) continue

            if (fs.existsSync(process.cwd() + '/' + tf.name + '.js')) {
              let func = require(process.cwd() + '/' + tf.name)
              tf.oldExistDb = {
                name: oldExistDb.name,
                sysname: oldExistDb.sysname,
              }
              tf.oldCl = oldCl
              tf.newExistDb = {
                name: newExistDb.name,
                sysname: newExistDb.sysname,
              }
              tf.newCl = newCl
              newDocs = await func(newDocs, tf)
            }
          }
        }
      }
    }

    // 经过插件后还剩数量
    let afterFilterMoveTotal = newDocs.length
    if (newDocs.length == 0)
      return [false, '没有选择数据或为重复数据或不满足插件要求']

    // 去除newDocs的_id
    let newDocs2 = JSON.parse(JSON.stringify(newDocs)).map((nd) => {
      delete nd._id
      // 加工数据
      this._beforeProcessByInAndUp(nd, 'insert')

      return nd
    })

    const client = this.mongoClient
    // 将数据插入到指定表中
    const clNew = client.db(newExistDb.sysname).collection(newCl)
    let rst = await clNew
      .insertMany(newDocs2)
      .then((rst) => [true, rst])
      .catch((err) => [false, err.toString()])
    if (rst[0] === false) return [false, '数据插入指定表错误: ' + rst[1]]
    rst = rst[1]

    // 如果计划插入总数不等于实际插入总数，需回滚
    if (rst.insertedCount != newDocs.length) {
      Object.keys(rst.insertedIds).forEach(async (k) => {
        let newId = rst.insertedIds[k]
        await clNew.deleteOne({
          _id: new ObjectId(newId),
        })
      })
      return [
        false,
        '插入数据数量错误需插入：' +
          newDocs.length +
          '；实际插入：' +
          rst.insertedCount,
      ]
    }

    // 插入成功后删除旧数据
    let passDocIds = []
    newDocs.forEach((nd) => {
      passDocIds.push(new ObjectId(nd._id))
    })
    const clOld = client.db(oldExistDb.sysname).collection(oldCl)
    let rstDelOld = await clOld
      .deleteMany({
        _id: {
          $in: passDocIds,
        },
      })
      .then((rst) => [true, rst])
      .catch((err) => [false, err.toString()])

    if (rstDelOld[0] === false)
      return [false, '数据以到指定集合中，但删除旧数据时失败']
    rstDelOld = rstDelOld[1]

    // 记录日志
    if (TMWCONFIG.TMS_APP_DATA_ACTION_LOG === 'Y') {
      let moveOldDatas = {}
      oldDocus.forEach((od) => {
        if (passDocIds.includes(od._id)) {
          moveOldDatas[od._id] = od
        }
      })
      let modelD = new modelDocu()
      await modelD.dataActionLog(
        newDocs,
        '移动',
        oldExistDb.name,
        oldCl,
        newExistDb.name,
        newCl,
        moveOldDatas
      )
    }

    let returnData = {
      planMoveTotal,
      afterFilterMoveTotal,
      rstInsNew: rst,
      rstDelOld,
    }
    return [true, returnData]
  }

  /**
   * 多选单选转换
   *
   * @param {*} model 'toValue' 'toLabel'
   * @param {*} data 数据源
   * @param {*} columns 集合列
   */
  transformsCol(model, data, columns) {
    let sourceData = JSON.parse(JSON.stringify(data))
    logger.info('data数据源', sourceData)

    const gets = model === 'toLabel' ? 'value' : 'label'
    const sets = model === 'toLabel' ? 'label' : 'value'

    Object.keys(columns).forEach((ele) => {
      // 输入框
      if (columns[ele].type === 'string' && data.length) {
        sourceData.forEach((item, index) => {
          data[index][ele] =
            data[index][ele] && data[index][ele].trim().replace(/\n/g, '')
        })
      }
      // 多选
      if (columns[ele].type === 'array' && columns[ele].enum) {
        sourceData.forEach((item, index) => {
          if (model === 'toValue' && Array.isArray(item[ele]))
            return data[index]
          let arr = []
          let enums =
            model === 'toValue' && item[ele] && typeof item[ele] === 'string'
              ? data[index][ele].split(',').filter((ele) => ele)
              : data[index][ele]
          if (enums && Array.isArray(enums)) {
            if (model === 'toValue') {
              enums = enums.map((ele) => ele.trim().replace(/\n/g, ''))
            }
            if (columns[ele].enumGroups && columns[ele].enumGroups.length) {
              columns[ele].enumGroups
                .filter((enumGroup) => {
                  if (
                    enumGroup.assocEnum &&
                    enumGroup.assocEnum.property &&
                    enumGroup.assocEnum.value
                  ) {
                    let currentVal = ''
                    let property = enumGroup.assocEnum.property
                    if (model === 'toValue') {
                      let filterEnum = columns[property].enum.filter(
                        (e) => e.label === item[property]
                      )
                      currentVal = filterEnum[0].value
                    } else {
                      currentVal = item[property]
                    }
                    return currentVal === enumGroup.assocEnum.value
                  }
                })
                .map((oEnumG) => {
                  columns[ele].enum.forEach((childItem) => {
                    if (
                      childItem.group === oEnumG.id &&
                      enums.includes(childItem[gets])
                    ) {
                      arr.push(childItem[sets])
                    }
                  })
                })
            } else {
              columns[ele].enum.forEach((childItem) => {
                if (enums.includes(childItem[gets])) arr.push(childItem[sets])
              })
            }
            // 当且仅当导入多选选项，enums与集合列定义存在差集，则失败
            function enumFilter(item) {
              let labels = columns[ele].enum.map(
                (childItem) => childItem['label']
              )
              if (!labels.includes(item)) return item
              //return !columns[ele].enum.map(childItem => childItem['label']).includes(item)
            }
            const filterEnums = enums.filter(enumFilter)
            if (model === 'toValue' && filterEnums.length) {
              logger.info('存在差集', filterEnums)
              throw '多选不匹配，导入失败'
            }
          }
          // 当且仅当导入多选选项，字符之间间隔不是','间隔，则失败
          if (model === 'toValue' && item[ele] && !arr.length) {
            logger.info('非逗号间隔', item[ele], arr)
            throw '多选不匹配，导入失败'
          }
          data[index][ele] = model === 'toLabel' ? arr.join(',') : arr

          return data[index]
        })
      } else if (columns[ele].type === 'string' && columns[ele].enum) {
        sourceData.forEach((item, index) => {
          let labels = columns[ele].enum.map((ele) => ele.label)
          let flag = labels.includes(item[ele])
          if (model === 'toValue' && item[ele] && !flag) {
            logger.info('单选不匹配', labels)
            throw '单选不匹配，导入失败'
          }
          columns[ele].enum.forEach((childItem) => {
            if (item[ele] === childItem[gets])
              data[index][ele] = childItem[sets]
          })
          return data[index]
        })
      }
    })
  }

  /**
   *  提取excel数据到集合中
   *  unrepeat 是否对数据去重
   */
  async _importToColl(existDb, clName, filename, options = {}) {
    if (!fs.existsSync(filename)) return [false, '指定的文件不存在']
    let unrepeat = options.unrepeat ? options.unrepeat : false

    const xlsx = require('tms-koa/node_modules/xlsx')
    const wb = xlsx.readFile(filename)
    const firstSheetName = wb.SheetNames[0]
    const sh = wb.Sheets[firstSheetName]
    const rowsJson = xlsx.utils.sheet_to_json(sh)

    const client = this.mongoClient
    let columns = await modelColl.getSchemaByCollection(existDb, clName)
    if (!columns) {
      return [false, '指定的集合没有指定集合列']
    }
    let jsonFinishRows = rowsJson.map((row) => {
      let newRow = {}
      for (const k in columns) {
        let column = columns[k]
        let _default = column.default
        let rDByTitle = row[column.title]
        if (typeof rDByTitle === 'number') {
          newRow[k] = String(rDByTitle)
        } else if (typeof rDByTitle === 'undefined') {
          logger.info(column.title, column.default)
          // 单选
          if (
            column.type === 'string' &&
            column.enum &&
            column.enum.length &&
            column.default &&
            column.default.length
          ) {
            newRow[k] = column.enum.find(
              (ele) => ele.value === column.default
            ).label
          } else if (
            column.type === 'array' &&
            column.enum &&
            column.enum.length &&
            column.default &&
            column.default.length
          ) {
            const target = column.enum.map((ele) => {
              if (column.default.includes(ele.value)) {
                return ele.label
              }
            })
            newRow[k] = target.join(',')
          } else {
            //存在默认值
            newRow[k] = column.default || null
          }
        } else {
          newRow[k] = rDByTitle
        }
      }
      // 加工数据
      this._beforeProcessByInAndUp(newRow, 'insert')

      return newRow
    })

    // 去重
    if (unrepeat && unrepeat.columns && unrepeat.columns.length > 0) {
      jsonFinishRows = unrepeatByArray(
        jsonFinishRows,
        unrepeat.columns,
        unrepeat.keepFirstRepeatData
      )
    }

    this.transformsCol('toValue', jsonFinishRows, columns)

    try {
      return client
        .db(existDb.sysname)
        .collection(clName)
        .insertMany(jsonFinishRows)
        .then(async () => {
          if (TMWCONFIG.TMS_APP_DATA_ACTION_LOG === 'Y') {
            // 记录日志
            let modelD = new modelDocu()
            await modelD.dataActionLog(
              jsonFinishRows,
              '导入',
              existDb.name,
              clName
            )
          }
          return [true, jsonFinishRows]
        })
    } catch (err) {
      logger.warn('Document.insertMany', err)
      return [false, err.message]
    }
  }
  /**
   *  根据规则取出数据
   *  规则格式 [{city: 北京, city: 开头是:北京, city: 开头是:北京&结尾不是:市 }]
   */
  async getDocsByRule2(existDb, clName, rules, planTotalColumn = 'need_sum') {
    // 根据规则取出数据
    const client = this.mongoClient
    let cl = client.db(existDb.sysname).collection(clName)
    let docs = rules.map(async (rule) => {
      if (
        !planTotalColumn ||
        !rule[planTotalColumn] ||
        rule[planTotalColumn] < 1
      ) {
        let data = {
          code: 500,
          msg: '未指定需求数量 或 数量小于1',
        }
        for (const k in rule) {
          data[k] = rule[k]
        }
        return data
      }

      // let need_sum = planTotalColumn ? parseInt(rule[planTotalColumn]) : 0
      let need_sum = parseInt(rule[planTotalColumn])
      let find = {
        $and: [],
      }
      for (const schemaKey in rule) {
        if (
          schemaKey === planTotalColumn ||
          schemaKey === '_id' ||
          schemaKey === TMWCONFIG['TMS_APP_DEFAULT_UPDATETIME'] ||
          schemaKey === TMWCONFIG['TMS_APP_DEFAULT_CREATETIME']
        )
          continue
        if (!rule[schemaKey]) continue

        // 多条件
        let schemaVals = rule[schemaKey].split('&')
        for (let schemaVal of schemaVals) {
          let whereKey, whereVal, sVals
          if (schemaVal.indexOf('：') !== -1) {
            sVals = schemaVal.split('：')
          } else if (schemaVal.indexOf(':') !== -1) {
            sVals = schemaVal.split(':')
          } else {
            sVals = ['等于', schemaVal]
          }
          if (sVals.length !== 2) continue
          whereKey = sVals[0]
          whereVal = sVals[1]

          let whereAnd = {}
          if (['包含', 'like'].includes(whereKey)) {
            whereAnd[schemaKey] = {
              $regex: whereVal,
            }
          } else if (['不包含', 'notlike'].includes(whereKey)) {
            whereAnd[schemaKey] = {
              $not: {
                $regex: whereVal,
              },
            }
          } else if (['不包含值', 'notin'].includes(whereKey)) {
            if (schemaKey === 'byId') {
              let ids = whereVal.split(',')
              let ids2 = []
              ids.forEach((id) => {
                ids2.push(new ObjectId(id))
              })
              whereAnd._id = {
                $not: {
                  $in: ids2,
                },
              }
            } else {
              whereAnd[schemaKey] = {
                $not: {
                  $in: whereVal.split(','),
                },
              }
            }
          } else if (['开头是', 'start'].includes(whereKey)) {
            whereAnd[schemaKey] = {
              $regex: '^' + whereVal + '.*$',
            }
          } else if (['开头不是', 'notstart'].includes(whereKey)) {
            whereAnd[schemaKey] = {
              $not: {
                $regex: '^' + whereVal + '.*$',
              },
            }
          } else if (['结尾是', 'end'].includes(whereKey)) {
            whereAnd[schemaKey] = {
              $regex: '^.*' + whereVal + '$',
            }
          } else if (['结尾不是', 'notend'].includes(whereKey)) {
            whereAnd[schemaKey] = {
              $not: {
                $regex: '^.*' + whereVal + '$',
              },
            }
          } else if (['大于', 'gt'].includes(whereKey)) {
            whereAnd[schemaKey] = {
              $gt: whereVal,
            }
          } else if (['小于', 'lt'].includes(whereKey)) {
            whereAnd[schemaKey] = {
              $lt: whereVal,
            }
          } else {
            whereAnd[schemaKey] = whereVal
          }
          find['$and'].push(whereAnd)
        }
      }

      // 查询
      let existTotal = await cl.find(find).count()
      if (need_sum > 0 && need_sum > existTotal) {
        let data = {
          code: 500,
          msg: '需求数大于实际数，不可分配',
          need_sum: need_sum,
          exist_total: existTotal,
        }
        for (const k in rule) {
          data[k] = rule[k]
        }
        return data
      }

      let dc = await cl.find(find).limit(need_sum).toArray()

      let data = {
        code: 0,
        msg: '成功',
        need_sum: need_sum,
        exist_total: existTotal,
        data: dc,
      }

      for (const k in rule) {
        data[k] = rule[k]
      }
      return data
    })

    return Promise.all(docs).then((rst) => {
      return [true, rst]
    })
  }
  /**
   * 批量修改数据
   */
  async updateMany() {
    const existDb = await this.docHelper.findRequestDb()
    let { cl: clName } = this.request.query
    if (!clName) return new ResultFault('参数不完整')

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
      find = this._assembleFind(filter)
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
    this._beforeProcessByInAndUp(set, 'update')

    const client = this.mongoClient
    return client
      .db(existDb.sysname)
      .collection(clName)
      .updateMany(find, {
        $set: set,
      })
      .then((rst) => {
        // 日志
        if (TMWCONFIG.TMS_APP_DATA_ACTION_LOG === 'Y') {
          let modelD = new modelDocu()
          modelD.dataActionLog({}, logOperate, existDb.name, clName)
        }

        return new ResultData(rst.result)
      })
  }
  /**
   * 返回指定文档的完成度
   */
  async getDocCompleteStatusById() {
    const existDb = await this.docHelper.findRequestDb()
    let { cl: clName } = this.request.query
    if (!clName) return new ResultFault('参数不完整')

    let { docIds } = this.request.body
    if (!Array.isArray(docIds) || docIds.length === 0)
      return new ResultFault('没有要查询的数据')

    const docIds2 = docIds.map((id) => new ObjectId(id))
    const find = { _id: { $in: docIds2 } }

    const client = this.mongoClient
    const cl = client.db(existDb.sysname).collection(clName)
    return cl
      .find(find)
      .toArray()
      .then(async (docs) => {
        await modelDocu.getDocCompleteStatus(existDb, clName, docs)
        return docs
      })
  }
}

module.exports = DocBase
