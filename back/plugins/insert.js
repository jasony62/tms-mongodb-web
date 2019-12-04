const { Context } = require('../context')
const ObjectId = require('mongodb').ObjectId
const _ = require('lodash')

module.exports = async function(docs, tf, toDBName) {
    let { db:dbName, cl:clName, toDBNames } = tf[1]
    if ( !dbName || !clName || !toDBNames) {
        return Promise.resolve([])
    }

    // 只存到指定表的数据
    if (!toDBNames.includes(toDBName)) {
        return Promise.resolve(docs)
    }

    let newDocs2 = (JSON.parse(JSON.stringify(docs))).map(nd => {
        delete nd._id
        return nd
    })
    const client = await Context.mongoClient()
    const clNew = client.db(dbName).collection(clName)
    await clNew
        .insertMany(newDocs2)
        .then( rst => [true, rst])
        .catch( err => [false, err.toString()] )

    return Promise.resolve(docs)
}