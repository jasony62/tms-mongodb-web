const { ResultData, ResultFault, ResultObjectNotFound } = require('tms-koa')
const Base = require('./base')

class Collection extends Base {
  constructor(...args) {
    super(...args)
  }
  /**
   * 指定数据库下新建集合
   */
  async create() {
    const existDb = await this.helper.findRequestDb()

    const info = this.request.body

    // 检查集合名
    let newName = this.helper.checkClName(info.name)
    if (newName[0] === false) return new ResultFault(newName[1])
    info.name = newName[1]

    // 查询是否存在同名集合
    let existCol = await this.helper.colByName(existDb.name, info.name)
    if (existCol) return new ResultFault('指定数据库中已存在同名预制集合')

    info.type = 'collection'
    info.database = existDb.name

    return this.clPreset
      .insertOne(info)
      .then((result) => new ResultData(result.ops[0]))
  }
  /**
   * 更新集合对象信息
   */
  async update() {
    const existDb = await this.helper.findRequestDb()

    let { cl: clName } = this.request.query
    let info = this.request.body

    // 格式化集合名
    let newClName = this.helper.checkClName(info.name)
    if (newClName[0] === false) return new ResultFault(newClName[1])
    newClName = newClName[1]

    // 检查是否已存在同名集合
    if (newClName !== clName) {
      // 查询是否存在同名集合
      let existCol = await this.helper.colByName(existDb.name, info.name)
      if (existCol) return new ResultData('已存在同名集合，不允许修改集合名称')
      else info.name = newClName
    } else {
      delete info.name
    }

    const query = { database: existDb.name, name: clName, type: 'collection' }
    const { _id, database, type, ...updatedInfo } = info

    const rst = await this.clPreset
      .updateOne(query, { $set: updatedInfo }, { upsert: true })
      .then((rst) => [true, rst.result])
      .catch((err) => [false, err.message])

    if (rst[0] === false) return new ResultFault(rst[1])

    return new ResultData(info)
  }
  /**
   * 删除集合
   */
  async remove() {
    const existDb = await this.helper.findRequestDb()

    let { cl: clName } = this.request.query

    const query = { database: existDb.name, name: clName, type: 'collection' }

    return this.clPreset.deleteOne(query).then(() => new ResultData('ok'))
  }
  /**
   * 根据名称返回指定集合
   */
  async byName() {
    const existDb = await this.helper.findRequestDb()

    const { cl: clName } = this.request.query
    const query = { database: existDb.name, name: clName, type: 'collection' }

    return this.clPreset
      .findOne(query, { projection: { _id: 0, type: 0 } })
      .then((myCl) => {
        if (myCl && myCl.schema_id) {
          return this.clPreset
            .findOne({ type: 'schema', _id: new ObjectId(myCl.schema_id) })
            .then((schema) => {
              myCl.schema = schema
              delete myCl.schema_id
              return myCl
            })
        }
        return myCl
      })
      .then((myCl) =>
        myCl ? new ResultData(myCl) : new ResultObjectNotFound()
      )
  }
  /**
   * 指定库下所有的集合
   */
  async list() {
    const existDb = await this.helper.findRequestDb()

    const query = { type: 'collection', database: existDb.name }
    const tmsCls = await this.clPreset
      .find(query, { projection: { _id: 0, type: 0, database: 0 } })
      .toArray()

    return new ResultData(tmsCls)
  }
}

module.exports = Collection
