import * as _ from 'lodash'
import Helper from './helper'
import unrepeatByArray from '../tms/utilities'

export default async function unrepeat(ctrl, data, transform) {
  let { columns, db: dbName, cl: clName, insert } = transform.config
  if (!columns || !dbName || !clName) {
    return Promise.resolve([])
  }

  const helper = new Helper(ctrl)
  const existCl = await helper.findRequestCl(true, dbName, clName)
  const cl = helper.findSysColl(existCl)

  // 去除重复数据
  let docs = unrepeatByArray(data, columns)
  let docs2 = await docs.map(async doc => {
    let find = {}
    columns.forEach(v => {
      find[v] = doc[v]
    })

    let num = await cl.countDocuments(find)
    if (num > 0) {
      return false
    } else {
      // 插入到去重表中
      if (insert) {
        let newDoc = JSON.parse(JSON.stringify(doc))
        delete newDoc._id
        let rst2 = await cl
          .insertOne(newDoc)
          .then(rst => doc)
          .catch(err => false)
        return rst2
      } else {
        return doc
      }
    }
  })

  return Promise.all(docs2).then(docs3 => {
    return _.filter(docs3, d => {
      if (d == false) {
        return false
      } else {
        return true
      }
    })
  })
}
