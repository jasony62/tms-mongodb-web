import { ModelClDir } from 'tmw-kit'
import { Helper as CtrlHelper } from 'tmw-kit/dist/ctrl/index.js'

/**
 * 集合分类控制器辅助类
 */
class CollectionDirHelper extends CtrlHelper {
  constructor(ctrl) {
    super(ctrl)
  }
  /**
   * 创建集合分类
   */
  async createClDir(
    existDb,
    info,
    parentFullName?: string
  ): Promise<boolean | any> {
    let modelClDir = new ModelClDir(
      this.ctrl.mongoClient,
      this.ctrl.bucket,
      this.ctrl.client
    )

    return await modelClDir.create(existDb, info, parentFullName)
  }
  /**
   * 创建集合分类
   */
  async updateClDir(existDb, id: string, info): Promise<boolean | any> {
    let modelClDir = new ModelClDir(
      this.ctrl.mongoClient,
      this.ctrl.bucket,
      this.ctrl.client
    )

    return await modelClDir.update(existDb, id, info)
  }
  /**
   * 创建集合分类
   */
  async removeClDir(existDb, id: string): Promise<[boolean, string | null]> {
    let modelClDir = new ModelClDir(
      this.ctrl.mongoClient,
      this.ctrl.bucket,
      this.ctrl.client
    )

    return await modelClDir.remove(existDb, id)
  }
  /**
   * 列出集合分类
   */
  async listClDir(existDb): Promise<[boolean, any]> {
    let modelClDir = new ModelClDir(
      this.ctrl.mongoClient,
      this.ctrl.bucket,
      this.ctrl.client
    )

    return await modelClDir.list(existDb)
  }
}

export default CollectionDirHelper
