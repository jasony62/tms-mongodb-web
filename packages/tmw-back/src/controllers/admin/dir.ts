import DirBase from '../dirBase.js'
/**
 * 集合分类目录
 */
class Dir extends DirBase {
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

export default Dir
