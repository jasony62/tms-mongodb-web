const ObjectId = require('mongodb').ObjectId
const Base = require('./base')
const moment = require('moment')
const TMSCONFIG = require('../../config')

class Document extends Base {
    /**
     * 模糊搜索数据
     */
    async listDocs(dbName, clName, options = {}, page = null, size = null, like = true) {
        let find = {}
        if (options.filter) {
            find = this._assembleFind(options.filter, like)
        }

        const client = await this.mongoClient()
        let cl = client.db(dbName).collection(clName)
        let data = {}
        let skip = 0
        let limit = 0
        if (page && page > 0 && size && size > 0) {
            skip = (parseInt(page) - 1) * parseInt(size)
            limit = parseInt(size)
        }
        // 排序
        let sort = {}
        if (options.orderBy && typeof options.orderBy === "object" && Object.keys(options.orderBy).length) {
            for (const key in options.orderBy) {
                let val = options.orderBy[key]
                if (val === "desc") {
                    sort[key] = -1
                } else {
                    sort[key] = 1
                }
            }  
        } else {
            sort._id = -1
        }

        data.docs = await cl
            .find(find)
            .skip(skip)
            .limit(limit)
            .sort(sort)
            .toArray()
            .then(docs => docs)
        
        data.total = await cl
            .find(find)
            .count()

        return [true, data]
    }
    //
    static async getDocumentByIds(dbName, clName, ids, fields = {}) {
        if (!dbName || !clName || !ids) {
            return [false, "参数不完整"]
        }

        let model = new Base()
        const client = await model.mongoClient()

        let docIds = []
        ids.forEach( id => {
            docIds.push(new ObjectId(id))
        })
        let find = {_id:{$in: docIds}}

        const cl = client.db(dbName).collection(clName)
        // 获取表列
        return cl
            .find(find)
            .project(fields)
            .toArray()
            .then( rst => [true, rst])
            .catch( err => [false, err.toString()] )
    }
    // 记录数据操作日志
    async dataActionLog(oDatas, operate_type, dbname, clname, operate_after_dbname = "", operate_after_clname = "", operate_before_data = "") {
        if (!operate_type || !dbname || !clname) return false
        if (TMSCONFIG.TMS_APP_DATA_ACTION_LOG !== "Y") return true
        if (dbname === "tms_admin" && clname === "tms_app_data_action_log") return false

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
        const cl2 = cl.collection("tms_app_data_action_log")
        if (operate_before_data && Array.isArray(operate_before_data)) {
            let newDatas = {}
            operate_before_data.forEach( (od) => {
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
                data.operate_id = ""
            }
            data.operate_dbname = dbname
            data.operate_clname = clname
            data.operate_after_dbname = operate_after_dbname
            data.operate_after_clname = operate_after_clname
            data.operate_time = current
            data.operate_type = operate_type
            // 旧数据
            if (operate_before_data) {
                if (typeof operate_before_data === "object" && operate_before_data[data.operate_id]) {
                    data.operate_before_data = JSON.stringify(operate_before_data[data.operate_id])
                } else if (typeof operate_before_data === "string") {
                    data.operate_before_data = operate_before_data
                }
            } else {
                data.operate_before_data = ""
            }

            await cl2.insertOne(data)
        }

        return true
    }
}

module.exports = Document