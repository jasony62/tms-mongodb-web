import { ResultData, ResultFault } from 'tms-koa'
import AclHelper from './aclHelper.js'
import { CtrlBase } from './ctrlBase.js'
/**
 * 管理对象访问控制列表控制器
 */
class AclBase extends CtrlBase {
  aclHelper
  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
    this.aclHelper = new AclHelper(this)
  }
  /**
   * 添加授权
   *
   * @returns
   */
  async add() {
    const { target, user } = this.request.body
    const [isOk, result] = await this.aclHelper.add(target, user)

    if (!isOk) return new ResultFault(result)

    return new ResultData(result)
  }
  /**
   * 删除授权
   *
   * @returns
   */
  async remove() {
    const { target, user } = this.request.body
    const [isOk, cause] = await this.aclHelper.remove(target, user)
    if (isOk) return new ResultData('ok')

    return new ResultFault(cause)
  }
  /**
   * 更新授权
   *
   * @returns
   */
  async update() {
    const { target, user, data } = this.request.body
    const [isOk, cause] = await this.aclHelper.update(target, user, data)
    if (isOk) return new ResultData('ok')

    return new ResultFault(cause)
  }
  /**
   * 检查用户授权
   *
   * @returns
   */
  async check() {
    const { target, user } = this.request.body
    const result = await this.aclHelper.check(target, user)

    if (result === null) return new ResultData(false)

    return new ResultData(result)
  }
  /**
   * 删除授权对象
   *
   * @returns
   */
  async clean() {
    const { target } = this.request.body
    const [isOk, cause] = await this.aclHelper.clean(target)
    if (isOk) return new ResultData('ok')

    return new ResultFault(cause)
  }
  /**
   * 获得指定对象的访问控制清单
   *
   * @returns
   */
  async list() {
    const { target } = this.request.body
    const [isOk, result] = await this.aclHelper.list(target)
    if (!isOk) return new ResultFault(result)

    return new ResultData(result)
  }
}

export default AclBase
