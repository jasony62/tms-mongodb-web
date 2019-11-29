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
}

module.exports = Index