const { Ctrl, ResultData, ResultFault } = require('tms-koa')
const { Context } = require('../context')

class Select extends Ctrl {
  constructor(...args) {
    super(...args)
  }
  /**
   *  根据号码查询区号
   * @param {*} ctx 
   */
  async getAreaCodeByArea() {
    let { db:dbName, cl:clName, province, city } = this.request.query
    if (!dbName || !clName || !province || !city) return new ResultFault("参数不完整")

    // 查询
    const client = await Context.mongoClient()
    let cl = client.db(dbName).collection(clName)

    let data = await cl.findOne({ province: province, city: city }, {projection: {province: 1, city: 1, areaCode: 1}})

    if (!data) {
      return new ResultData("无数据")
    }

    return new ResultData(data)
  }
}

module.exports = Select