const { Context } = require('../../context')
const ObjectId = require('mongodb').ObjectId

class Index{
    //
    static async getSchemaByCollection(dbName, clName) {
        const client = await Context.mongoClient()
        const cl = client.db('tms_admin').collection('mongodb_object')
        // 获取表列
        return cl
        .findOne({ database: dbName, name: clName, type: 'collection' })
        .then(result => result)
        .then(myCl => {
            if (!myCl) {
                return false
            }
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
    //
    static async getDocumentByCollection(dbName, clName, find, fields = {}) {
        if (!dbName || !clName || !find) {
            return [false, "参数不完整"]
        }

        const client = await Context.mongoClient()
        const cl = client.db(dbName).collection(clName)
        // 获取表列
        return cl
            .find(find)
            .project(fields)
            .toArray()
            .then( rst => [true, rst])
            .catch( err => [false, err.toString()] )
    }
}

module.exports = Index