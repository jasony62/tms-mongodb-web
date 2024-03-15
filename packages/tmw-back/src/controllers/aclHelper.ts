import { ModelAcl } from 'tmw-kit'
import { CtrlHelper } from './ctrlHelper.js'
/**
 * 管理对象访问控制列表控制器辅助
 */
class AclHelper extends CtrlHelper {
  constructor(ctrl) {
    super(ctrl)
  }
  get _modelAcl() {
    let model = new ModelAcl(
      this.ctrl.mongoClient,
      this.ctrl.bucket,
      this.ctrl.client
    )
    return model
  }
  /**
   *
   * @param target
   * @param user
   * @returns
   */
  async add(target, user): Promise<[boolean, any?]> {
    const result = await this._modelAcl.add(target, user)
    return result
  }
  /**
   *
   * @param target
   * @param user
   * @returns
   */
  async remove(target, user): Promise<[boolean, string?]> {
    const result = await this._modelAcl.remove(target, user)
    return result
  }
  /**
   *
   * @param target
   * @param user
   * @param data
   * @returns
   */
  async update(target, user, data): Promise<[boolean, string?]> {
    const result = await this._modelAcl.update(target, user, data)
    return result
  }
  /**
   *
   * @param target
   * @param user
   * @returns
   */
  async check(target, user): Promise<string[] | null> {
    const result = await this._modelAcl.check(target, user)
    return result
  }
  /**
   * 删除授权对象
   *
   * @param target
   * @returns
   */
  async clean(target): Promise<[boolean, string?]> {
    const result = await this._modelAcl.clean(target)
    return result
  }
  /**
   * 获得指定对象的访问控制清单
   *
   * @param target
   * @returns
   */
  async list(target): Promise<[boolean, string | any[]]> {
    const result = await this._modelAcl.list(target)
    return result
  }
}

export default AclHelper
