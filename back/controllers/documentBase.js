const { Ctrl, ResultData, ResultFault, ResultObjectNotFound } = require('tms-koa')
const fs = require('fs')
const modelMgdb = require('../models/mgdb')
const ObjectId = require('mongodb').ObjectId
const _ = require('lodash')
const { unrepeatByArray } = require('../tms/utilities')

class DocBase extends Ctrl {
    constructor(...args) {
        super(...args)
    }
    /**
     * 指定数据库指定集合下新建文档
     */
    async create() {
      const { db: dbName, cl: clName } = this.request.query
      const doc = this.request.body
      const client = this.mongoClient
      return client
        .db(dbName)
        .collection(clName)
        .insertOne(doc)
        .then(() => new ResultData(doc))
    }
    /**
     *
     */
    async remove() {
      const { db: dbName, cl: clName, id } = this.request.query
      const client = this.mongoClient
      return client
        .db(dbName)
        .collection(clName)
        .deleteOne({ _id: ObjectId(id) })
        .then(result => new ResultData(result.result))
    }
    /**
     * 指定数据库指定集合下的文档
     */
    async list() {
      const { db: dbName, cl: clName, page = null, size = null } = this.request.query
      const { filter = null } = this.request.body
  
      let data = await this.listDocs(dbName, clName, filter, page, size)
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
        let find = {}
        let fKeys = Object.keys(filter)
        if (like === true) {
            for (let fk of fKeys) {
                let val = filter[fk]
                let find2
                if (typeof val === "object" && val.keyword) {
                    if (val.feature === "start") {
                        find2 = { $regex: "^" + val.keyword }
                    } else if (val.feature === "notStart") {
                        find2 = {$not: { $regex: "^" + val.keyword }}
                    } else if (val.feature === "end") {
                        find2 = { $regex: "^.*" + val.keyword + "$" }
                    } else if (val.feature === "notEnd") {
                        find2 = {$not: { $regex: "^.*" + val.keyword + "$" }}
                    } else if (val.feature === "notLike") {
                        find2 = { $not: {$regex: val.keyword} }
                    } else {
                        find2 = { $regex : val.keyword }
                    }
                } else {
                    find2 = { $regex : val }
                }
                
                find[fk] = find2
            }
        } else {
            for (let fk of fKeys) {
                find[fk] = filter[fk]
            }
        }

        return find
    }
    /**
     * 模糊搜索数据
     */
    async listDocs(dbName, clName, filter, page = null, size = null, like = true) {
        let find = {}
        if (filter) {
            find = this._assembleFind(filter, like)
        }

        const client = this.mongoClient
        let cl = client.db(dbName).collection(clName)
        let data = {}
        if (page && page > 0 && size && size > 0) {
            let skip = (parseInt(page) - 1) * parseInt(size)
            let limit = parseInt(size)
            data.docs = await cl
                .find(find)
                .skip(skip)
                .limit(limit)
                .toArray()
                .then(docs => docs)
        } else {
            data.docs = await cl
                .find(find)
                .toArray()
                .then(docs => docs)
        }
        
        data.total = await cl
            .find(find)
            .count()

        return [true, data]
    }
    /**
     * 批量删除
     */
    async removeMany() {
        const { db: dbName, cl: clName } = this.request.query
        const { docIds, filter } = this.request.body
        const client = this.mongoClient
        let cl = client.db(dbName).collection(clName)
        
        if (docIds && docIds.length > 0) { // 按选中删除
            let docIds2 = []
            docIds.forEach( id => {
                docIds2.push(new ObjectId(id))
            })
            
            return cl
                .deleteMany({_id:{$in: docIds2}})
                .then(result => {
                    return new ResultData(result.result)
                })
        } else if (typeof filter === "string" && _.toUpper(filter) === "ALL") { // 清空表
            return cl
                .deleteMany({_id:{$ne: ""}})
                .then(result => {
                    return new ResultData(result.result)
                })
        } else if (typeof filter === "object") { // 按条件删除
            let find = this._assembleFind(filter)

            return cl
                .deleteMany(find)
                .then(result => {
                    return new ResultData(result.result)
                })
        } else {
            return new ResultData({n: 0, ok: 0})
        }
    }
    /**
     * 更新指定数据库指定集合下的文档
     */
    async update() {
      const { db: dbName, cl: clName, id } = this.request.query
      let doc = this.request.body
      doc = _.omit(doc, ['_id'])
      const client = this.mongoClient
      return client
        .db(dbName)
        .collection(clName)
        .updateOne({ _id: ObjectId(id) }, { $set: doc })
        .then(() => new ResultData(doc))
    }
    /**
     *  剪切数据到指定集合中
     */
    async cutDocs(oldDb, oldCl, newDb, newCl, docIds = null, options = {}, oldDocus = null) {
        //获取指定集合的列
        let newClSchema = await modelMgdb.getSchemaByCollection(newDb, newCl)
        if (!newClSchema) return [false, "指定的集合未指定集合列"]

        // 查询获取旧数据
        let fields = {}
        // for (const k in newClSchema) {
        //   fields[k] = 1
        // }
        if (!oldDocus || oldDocus.length === 0) {
            if (!docIds || docIds.length === 0) return [false, "没有要移动的数据"]
            oldDocus = await modelMgdb.getDocumentByIds(oldDb, oldCl, docIds, fields)
            if (oldDocus[0] === false) return [ false, oldDocus[1] ]
            oldDocus = oldDocus[1]
        }

        // 插入到指定集合中,补充没有的数据
        let newDocs = oldDocus.map( doc => {
            let newd = { _id: doc._id }
            for (const k in newClSchema) {
                if (typeof doc[k] === "undefined") {
                newd[k] = ''
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
            if (fs.existsSync(process.cwd() + "/config/plugins.js")) {
                let plugins = require(process.cwd() + "/config/plugins")
                let moveTransformDoc = _.get(plugins, 'document.transforms.move')
                if (moveTransformDoc && Array.isArray(moveTransformDoc)) {
                    for (const tf of moveTransformDoc) {
                        //
                        if (!transforms2.includes(tf.name)) continue
                        
                        if (fs.existsSync(process.cwd() + "/" + tf.name + ".js")) {
                            let func = require(process.cwd() + "/" + tf.name)
                            newDocs = await func(newDocs, tf)
                        }
                    }
                }
            }
        }

        // 经过插件后还剩数量
        let afterFilterMoveTotal = newDocs.length
        if (newDocs.length == 0) return [ false, "没有选择数据或为重复数据" ]

        // 去除newDocs的_id
        let newDocs2 = (JSON.parse(JSON.stringify(newDocs))).map(nd => {
            delete nd._id
            return nd
        })

        const client = this.mongoClient
        // 将数据插入到指定表中
        const clNew = client.db(newDb).collection(newCl)
        let rst = await clNew
            .insertMany(newDocs2)
            .then( rst => [true, rst])
            .catch( err => [false, err.toString()] )
        if (rst[0] === false) return [false, "数据插入指定表错误: " + rst[1]]
        rst = rst[1]
        
        // 如果计划插入总数不等于实际插入总数，需回滚
        if (rst.insertedCount != newDocs.length) {
            Object.keys(rst.insertedIds).forEach( async (k) => {
                let newId = rst.insertedIds[k]
                await clNew.deleteOne({_id: new ObjectId(newId)})
            })
            return [ false, '插入数据数量错误需插入：' + newDocs.length + "；实际插入：" + rst.insertedCount ]
        }
        
        // 插入成功后删除旧数据
        let passDocIds = []
        newDocs.forEach( nd => {
            passDocIds.push(new ObjectId(nd._id))
        })
        const clOld = client.db(oldDb).collection(oldCl)
        let rstDelOld = await clOld
            .deleteMany({_id:{$in: passDocIds}})
            .then( rst => [true, rst])
            .catch( err => [false, err.toString()] )

        if (rstDelOld[0] === false) return [false, '数据以到指定集合中，但删除旧数据时失败']
        rstDelOld = rstDelOld[1]

        let returnData = { planMoveTotal, afterFilterMoveTotal, rstInsNew: rst, rstDelOld }
        return [true, returnData]
    }
    /**
     *  提取excel数据到集合中
     *  unrepeat 是否对数据去重
     */
    async _importToColl(dbName, clName, filename, options = {}) {
        if (!fs.existsSync(filename)) return [ false, '指定的文件不存在']
        let unrepeat = options.unrepeat ? options.unrepeat : false

        const xlsx = require('tms-koa/node_modules/xlsx')
        const wb = xlsx.readFile(filename)
        const firstSheetName = wb.SheetNames[0]
        const sh = wb.Sheets[firstSheetName]
        const rowsJson = xlsx.utils.sheet_to_json(sh)
    
        const client = this.mongoClient
        let columns = await modelMgdb.getSchemaByCollection(dbName, clName)
        if (!columns) {
            return [false, '指定的集合没有指定集合列']
        }
    
        let jsonFinishRows = rowsJson.map(row => {
            let newRow = {}
            for (const k in columns) {
            let column = columns[k]
            let rowTitle = row[column.title]
            if (typeof rowTitle === "number") {
                newRow[k] = String(rowTitle)
            } else {
                newRow[k] = rowTitle
            }
            }
            return newRow
        })

        // 去重 
        if (unrepeat && unrepeat.columns && unrepeat.columns.length > 0) {
            jsonFinishRows = unrepeatByArray(jsonFinishRows, unrepeat.columns, unrepeat.keepFirstRepeatData)
        }

        try {
            return client
            .db(dbName)
            .collection(clName)
            .insertMany(jsonFinishRows)
            .then(() => [true, jsonFinishRows] )
        } catch (err) {
            logger.warn('Document.insertMany', err)
            return [false, err.message]
        }
    }
    /**
     *  根据规则取出数据
     *  规则格式 [{city: 北京, city: like,北京, city: notlike,北京 }]
     */
    async getDocsByRule2(dbName, clName, rules, planTotalColumn = "need_sum"){
        // 根据规则取出数据
        const client = this.mongoClient
        let cl = client.db(dbName).collection(clName)
        let docs = rules.map( async rule => {
            if (!planTotalColumn || (!rule[planTotalColumn] || rule[planTotalColumn] < 1)) {
                let data = {code: 500, msg: "未指定需求数量 或 数量小于1"}
                for (const k in rule) {
                    data[k] = rule[k]
                }
                return data
            }

            // let need_sum = planTotalColumn ? parseInt(rule[planTotalColumn]) : 0
            let need_sum = parseInt(rule[planTotalColumn])
            let find = {}
            for (const key in rule) {
                if (key === planTotalColumn || key === "_id") continue
                if (!rule[key]) continue

                let arrVal = rule[key].split(",")
                let rule2 = arrVal[0]
                if (rule2 === "like") {
                    find[key] = {$regex: arrVal[1]}
                } else if (rule2 === "notlike") {
                    find[key] = {$not: {$regex: arrVal[1]}}
                } else if (rule2 === "notin") {
                    if (key === "byId") {
                        let ids = arrVal[1].split(";")
                        let ids2 = []
                        ids.forEach( id => {
                            ids2.push(new ObjectId(id))
                        })
                        find._id = {$not: {$in: ids2}}
                    } else {
                        find[key] = {$not: {$in: arrVal[1].split(";")}}
                    }
                } else if ( rule2 === "start" ) {
                    find[key] = {$regex: "^" + arrVal[1]}
                } else {
                    find[key] = rule2
                }
            }

            // 查询
            let existTotal = await cl.find(find).count()
            if (need_sum > 0 && need_sum > existTotal) {
                let data = {code: 500, msg: "需求数大于实际数，不可分配", need_sum: need_sum, exist_total: existTotal}
                for (const k in rule) {
                    data[k] = rule[k]
                }
                return data
            }

            let dc = await cl.find(find).limit(need_sum).toArray()
            
            let data = { code: 0, msg: "成功", need_sum: need_sum, exist_total: existTotal, data: dc }

            for (const k in rule) {
                data[k] = rule[k]
            }
            return data
        })

        return Promise.all(docs).then( rst => {
            return [true, rst]
        })

    }
    /**
     * 批量修改数据
     */
    async updateMany() {
        let { db:dbName, cl:clName } = this.request.query
        if (!dbName || !clName) return new ResultFault("参数不完整")

        let { docIds, filter, columns } = this.request.body
        if (!columns || Object.keys(columns).length === 0) return new ResultFault("没有要修改的列")

        let find
        if (docIds && docIds.length > 0) { // 按选中修改
            let docIds2 = []
            docIds.forEach( id => {
                docIds2.push(new ObjectId(id))
            })
            find = {_id:{$in: docIds2}}
        } else if (filter && typeof filter === "object") { // 按条件修改
            find = this._assembleFind(filter)
        } else if (typeof filter === "string" && filter === "ALL") { //修改全部
            find = {}
        } else {
            return new ResultFault("没有要修改的数据")
        }

        let set = {}
        for (const key in columns) {
            set[key] = columns[key]
        }

        const client = this.mongoClient
        return client
            .db(dbName)
            .collection(clName)
            .updateMany(find, { $set: set })
            .then((rst) => new ResultData(rst.result))
    }
}

module.exports = DocBase