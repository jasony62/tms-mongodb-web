const { Context } = require('../context')
const ObjectId = require('mongodb').ObjectId
const _ = require('lodash')

module.exports = async function(docs, tf) {
    let { columns, db:dbName, cl:clName } = tf[1]
    if ( !columns || !dbName || !clName) {
        return Promise.resolve([])
    }

    const client = await Context.mongoClient()
    let cl = client.db(dbName).collection(clName)
    let docs2 = docs.map( async doc => {
        let find = {}
        columns.forEach( v => {
            find[v] = doc[v]
        })
        let num = await cl.find(find).count()
        if (num > 0) {
            return false
        } else {
            return doc
        }
    })

    return Promise.all(docs2).then( docs3 => {
        return _.filter(docs3, d => {
            if (d == false) {
                return false
            } else {
                return true
            }
        })
    })
}