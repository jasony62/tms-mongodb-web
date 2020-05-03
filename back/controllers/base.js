const { Ctrl, ResultFault, ResultObjectNotFound } = require('tms-koa')

class Base extends Ctrl {
  constructor(...args) {
    super(...args)
  }
  async tmsBeforeEach() {
    const bucketName = this.request.query.bucket
    if (/yes|true/i.test(process.env.TMW_REQUIRE_BUCKET)) {
      if (!bucketName) {
        return new ResultFault('没有提供bucket参数')
      }
      // 检查bucket是否存在
      const client = this.mongoClient
      const clBucket = client.db('tms_admin').collection('bucket')
      const bucket = await clBucket.findOne({ name: bucketName })
      if (!bucket) {
        return new ResultObjectNotFound('指定的bucket不存在')
      }
      // 检查当前用户是否对bucket有权限
      if (info.creator !== this.client.id) {
        // 检查是否做过授权
        return new ResultObjectNotFound('没有访问指定bucket的权限')
      }
      this.bucket = bucket
    }

    return true
  }
}

module.exports = Base
