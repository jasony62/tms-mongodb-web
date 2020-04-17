const ObjectId = require('mongodb').ObjectId
const Base = require('./base')

class Collection extends Base {
    //
    static async getSchemaByCollection(dbName, clName) {
        const model = new Base()
        const client = await model.mongoClient()
        const cl = client.db('tms_admin').collection('mongodb_object')
        // 获取表列
        return cl
            .findOne({ database: dbName, name: clName, type: 'collection' })
            .then(myCl => {
                if (!myCl) {
                    return false
                }
                if (myCl.schema_id) {
                    return cl
                    .findOne({ type: 'schema', _id: new ObjectId(myCl.schema_id) })
                    .then(schema => {
                        if (!schema) {
                            return false
                        }

                        return schema.body.properties
                    })
                }

                return false
            })
    }
    //
    static async getCollection(dbName, clName) {
        const model = new Base()
        const client = await model.mongoClient()
        const cl = client.db('tms_admin').collection('mongodb_object')
        //
        return cl
            .findOne({ database: dbName, name: clName, type: 'collection' })
            .then(result => result)
            .then(myCl => {
              if (myCl.schema_id) {
                return cl
                  .findOne({ type: 'schema', _id: new ObjectId(myCl.schema_id) })
                  .then(schema => {
                    myCl.schema = schema
                    delete myCl.schema_id
                    return myCl
                  })
              }
              delete myCl.schema_id
              return myCl
            })
    }
    /**
   *  检查集合名
   */
    _checkClName(clName) {
        if (clName.search(/[\u4E00-\u9FA5]|[\uFE30-\uFFA0]/gi) !== -1) return [false, "集合名不能包含中文"]

        let newName = clName.replace(/\s/g, "")
        
        // 格式要求
        if (!newName) return [false, "集合名不能为空"]
        if (!isNaN(newName)) return [false, "集合名不能全为数字"]
        // 集合名是否存在关键字中
        let keyWord = []
        if (keyWord.includes(newName)) return [false, "不能以此名作为集合名，请更换为其它名称"]

        return [true, newName]
    }
}

module.exports = Collection