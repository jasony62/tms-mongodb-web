const { unrepeatByArray } = require('../tms/utilities')
const log4js = require('log4js')
const logger = log4js.getLogger('tms-mongodb-web')
const ObjectId = require('mongodb').ObjectId
const fs = require('fs')

const ModelColl = require('../models/mgdb/collection')
const ModelDoc = require('../models/mgdb/document')

const APPCONTEXT = require('tms-koa').Context.AppContext
const TMWCONFIG = APPCONTEXT.insSync().appConfig.tmwConfig

const Helper = require('./helper')
/**
 * 数据库控制器辅助类
 */
class DocumentHelper extends Helper {
  /**
   * 获得请求的批量更新/删除条件
   *
   * @returns {object} 失败时errCause不为空，其内容为失败原因；否则，query为查询条件；operation为操作类型说明。
   */
  getRequestBatchQuery() {
    let { filter, docIds } = this.ctrl.request.body
    let query, operation, errCause

    if (Array.isArray(docIds) && docIds.length) {
      // 按选中删除
      query = {
        _id: {
          $in: docIds.map(id => ObjectId(id))
        }
      }
      operation = '批量（按选中）'
    } else if (typeof filter === 'string' && /all/i.test(filter)) {
      // 清空表
      query = {}
      operation = '批量（按全部）'
    } else if (typeof filter === 'object' && Object.keys(filter).length) {
      // 按条件删除
      const modelDoc = new ModelDoc()
      query = modelDoc.assembleQuery(filter)
      operation = '批量（按条件）'
    } else {
      errCause = '无效的批量文档指定条件，未执行删除操作'
    }

    return { query, operation, errCause }
  }
  /**
   *  提取excel数据到集合中
   *  unrepeat 是否对数据去重
   */
  async importToColl(existCl, filename, options = {}) {
    if (!fs.existsSync(filename)) return [false, '指定的文件不存在']
    let unrepeat = options.unrepeat ? options.unrepeat : false

    const xlsx = require('tms-koa/node_modules/xlsx')
    const wb = xlsx.readFile(filename)
    const firstSheetName = wb.SheetNames[0]
    const sh = wb.Sheets[firstSheetName]
    const rowsJson = xlsx.utils.sheet_to_json(sh)

    let collModel = new ModelColl()
    let columns = await collModel.getSchemaByCollection(existCl)
    if (!columns) {
      return [false, '指定的集合没有指定集合列']
    }
    let jsonFinishRows = rowsJson.map(row => {
      let newRow = {}
      for (const k in columns) {
        let column = columns[k]
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
              ele => ele.value === column.default
            ).label
          } else if (
            column.type === 'array' &&
            column.enum &&
            column.enum.length &&
            column.default &&
            column.default.length
          ) {
            const target = column.enum.map(ele => {
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
      collModel.beforeProcessByInAndUp(newRow, 'insert')

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
      return this.findSysColl(existCl)
        .insertMany(jsonFinishRows)
        .then(async () => {
          if (TMWCONFIG.TMS_APP_DATA_ACTION_LOG === 'Y') {
            // 记录日志
            const modelDoc = new ModelDoc()
            await modelDoc.dataActionLog(
              jsonFinishRows,
              '导入',
              existCl.db.name,
              existCl.name
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

    Object.keys(columns).forEach(ele => {
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
              ? data[index][ele].split(',').filter(ele => ele)
              : data[index][ele]
          if (enums && Array.isArray(enums)) {
            if (model === 'toValue') {
              enums = enums.map(ele => ele.trim().replace(/\n/g, ''))
            }
            if (columns[ele].enumGroups && columns[ele].enumGroups.length) {
              columns[ele].enumGroups
                .filter(enumGroup => {
                  if (
                    enumGroup.assocEnum &&
                    enumGroup.assocEnum.property &&
                    enumGroup.assocEnum.value
                  ) {
                    let currentVal = ''
                    let property = enumGroup.assocEnum.property
                    if (model === 'toValue') {
                      let filterEnum = columns[property].enum.filter(
                        e => e.label === item[property]
                      )
                      currentVal = filterEnum[0].value
                    } else {
                      currentVal = item[property]
                    }
                    return currentVal === enumGroup.assocEnum.value
                  }
                })
                .map(oEnumG => {
                  columns[ele].enum.forEach(childItem => {
                    if (
                      childItem.group === oEnumG.id &&
                      enums.includes(childItem[gets])
                    ) {
                      arr.push(childItem[sets])
                    }
                  })
                })
            } else {
              columns[ele].enum.forEach(childItem => {
                if (enums.includes(childItem[gets])) arr.push(childItem[sets])
              })
            }
            // 当且仅当导入多选选项，enums与文档列定义存在差集，则失败
            function enumFilter(item) {
              let labels = columns[ele].enum.map(
                childItem => childItem['label']
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
          let labels = columns[ele].enum.map(ele => ele.label)
          let flag = labels.includes(item[ele])
          if (model === 'toValue' && item[ele] && !flag) {
            logger.info('单选不匹配', labels)
            throw '单选不匹配，导入失败'
          }
          columns[ele].enum.forEach(childItem => {
            if (item[ele] === childItem[gets])
              data[index][ele] = childItem[sets]
          })
          return data[index]
        })
      }
    })
  }
  /**
   *  剪切数据到指定集合中
   */
  async cutDocs(oldExistCl, newExistCl, docIds = null, oldDocus = null) {
    //获取指定集合的列
    const collModel = new ModelColl()
    let newClSchema = await collModel.getSchemaByCollection(newExistCl)
    if (!newClSchema) return [false, '指定的集合未指定集合列定义']

    // 查询获取旧数据
    let fields = {}
    const modelDoc = new ModelDoc()
    if (!oldDocus || oldDocus.length === 0) {
      if (!docIds || docIds.length === 0) return [false, '没有要移动的数据']
      oldDocus = await modelDoc.getDocumentByIds(oldExistCl, docIds, fields)
      if (oldDocus[0] === false) return [false, oldDocus[1]]
      oldDocus = oldDocus[1]
    }

    // 插入到指定集合中,补充没有的数据
    let newDocs = oldDocus.map(doc => {
      let newd = {
        _id: doc._id
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

    // 经过插件后还剩数量
    let afterFilterMoveTotal = newDocs.length
    if (newDocs.length == 0)
      return [false, '没有选择数据或为重复数据或不满足插件要求']

    // 去除newDocs的_id
    let newDocs2 = JSON.parse(JSON.stringify(newDocs)).map(nd => {
      delete nd._id
      // 加工数据
      modelDoc.beforeProcessByInAndUp(nd, 'insert')

      return nd
    })

    const client = this.ctrl.mongoClient
    // 将数据插入到指定表中
    const clNew = client
      .db(newExistCl.db.sysname)
      .collection(newExistCl.sysname)
    let rst = await clNew
      .insertMany(newDocs2)
      .then(rst => [true, rst])
      .catch(err => [false, err.toString()])
    if (rst[0] === false) return [false, '数据插入指定表错误: ' + rst[1]]
    rst = rst[1]

    // 如果计划插入总数不等于实际插入总数，需回滚
    if (rst.insertedCount != newDocs.length) {
      Object.keys(rst.insertedIds).forEach(async k => {
        let newId = rst.insertedIds[k]
        await clNew.deleteOne({
          _id: new ObjectId(newId)
        })
      })
      return [
        false,
        '插入数据数量错误需插入：' +
          newDocs.length +
          '；实际插入：' +
          rst.insertedCount
      ]
    }

    // 插入成功后删除旧数据
    let passDocIds = []
    newDocs.forEach(nd => {
      passDocIds.push(new ObjectId(nd._id))
    })
    const clOld = client
      .db(oldExistCl.db.sysname)
      .collection(oldExistCl.sysname)
    let rstDelOld = await clOld
      .deleteMany({
        _id: {
          $in: passDocIds
        }
      })
      .then(rst => [true, rst])
      .catch(err => [false, err.toString()])

    if (rstDelOld[0] === false)
      return [false, '数据以到指定集合中，但删除旧数据时失败']
    rstDelOld = rstDelOld[1]

    // 记录日志
    if (TMWCONFIG.TMS_APP_DATA_ACTION_LOG === 'Y') {
      let moveOldDatas = {}
      oldDocus.forEach(od => {
        if (passDocIds.includes(od._id)) {
          moveOldDatas[od._id] = od
        }
      })
      await modelDoc.dataActionLog(
        newDocs,
        '移动',
        oldExistCl.db.name,
        oldExistCl.name,
        newExistCl.db.name,
        newExistCl.name,
        moveOldDatas
      )
    }

    let returnData = {
      planMoveTotal,
      afterFilterMoveTotal,
      rstInsNew: rst,
      rstDelOld
    }

    return [true, returnData]
  }
}

module.exports = DocumentHelper
