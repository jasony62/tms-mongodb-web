import { Ctrl, ResultFault, ResultObjectNotFound } from 'tms-koa'
import { loadTmwConfig } from '../util/index.js'

/**
 * 保存元数据的数据库
 */
const META_ADMIN_DB = process.env.TMW_APP_META_ADMIN_DB || 'tms_admin'

const TMW_CONFIG = await loadTmwConfig()

function allowAccessBucket(bucket, clientId) {
  if (bucket.creator === clientId) return true

  const { coworkers } = bucket

  if (!Array.isArray(coworkers)) return false

  return coworkers.some((c) => c.id === clientId)
}

const isRequireBucket = /yes|true/i.test(process.env.TMW_REQUIRE_BUCKET)

class Base extends Ctrl {
  bucketObj
  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
  }
  get tmwConfig() {
    return TMW_CONFIG
  }
  /**
   * 系统调用控制器方法前执行
   *
   * 如果打开了环境变量`TMW_REQUIRE_BUCKET`，那么进行bucket访问权限检查，要求当前用户是指定bucket的创建用户或授权访问用户。
   */
  async tmsBeforeEach() {
    /* 多租户模式下，检查bucket访问权限 */
    if (isRequireBucket) {
      const bucketName = this.request.query.bucket
      if (!bucketName) {
        return new ResultFault('没有提供bucket参数')
      }
      // 检查bucket是否存在
      const client = this.mongoClient
      const clBucket = client.db(META_ADMIN_DB).collection('bucket')
      const bucketObj = await clBucket.findOne({
        name: bucketName,
      })
      if (!bucketObj) {
        return new ResultObjectNotFound(`指定的[bucket=${bucketName}]不存在`)
      }
      // 检查当前用户是否对bucket有权限
      if (!allowAccessBucket(bucketObj, this.client.id)) {
        // 检查是否做过授权
        return new ResultObjectNotFound(`没有访问[bucket=${bucketName}]的权限`)
      }
      this.bucketObj = bucketObj
    }

    return true
  }
}

export default Base
