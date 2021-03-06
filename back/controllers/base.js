const { Ctrl, ResultFault, ResultObjectNotFound } = require('tms-koa')

function allowAccessBucket(bucket, clientId) {
  if (bucket.creator === clientId) return true

  const { coworkers } = bucket

  if (!Array.isArray(coworkers)) return false

  return coworkers.some((c) => c.id === clientId)
}

class Base extends Ctrl {
  /**
   * 创建控制器
   *
   * @param  {...any} args
   */
  constructor(...args) {
    super(...args)
  }
  /**
   * 系统调用控制器方法前执行
   *
   * 如果打开了环境变量`TMW_REQUIRE_BUCKET`，那么进行bucket访问权限检查，要求当前用户是指定bucket的创建用户或授权访问用户。
   */
  async tmsBeforeEach() {
    /* 多租户模式下，检查bucket访问权限 */
    if (/yes|true/i.test(process.env.TMW_REQUIRE_BUCKET)) {
      const bucketName = this.request.query.bucket
      if (!bucketName) {
        return new ResultFault('没有提供bucket参数')
      }
      // 检查bucket是否存在
      const client = this.mongoClient
      const clBucket = client.db('tms_admin').collection('bucket')
      const bucket = await clBucket.findOne({
        name: bucketName,
      })
      if (!bucket) {
        return new ResultObjectNotFound(`指定的[bucket=${bucketName}]不存在`)
      }
      // 检查当前用户是否对bucket有权限
      if (!allowAccessBucket(bucket, this.client.id)) {
        // 检查是否做过授权
        return new ResultObjectNotFound(`没有访问[bucket=${bucketName}]的权限`)
      }
      this.bucket = bucket
    }

    return true
  }
}

module.exports = Base
