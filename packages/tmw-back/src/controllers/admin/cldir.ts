import ClDirBase from '../cldirBase.js'
/**
 * 集合分类目录
 */
class CollectionDir extends ClDirBase {
  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
  }
  /**
   *
   * @returns
   */
  async create() {
    return super.create()
  }
  /**
   *
   * @returns
   */
  async update() {
    return super.update()
  }
  /**
   *
   * @returns
   */
  async remove() {
    return super.remove()
  }
}

export default CollectionDir
