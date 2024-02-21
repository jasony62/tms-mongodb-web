import AclBase from '../aclBase.js'

/**
 * 集合分类目录
 */
class Acl extends AclBase {
  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
  }
}

export default Acl
