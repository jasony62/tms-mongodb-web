import { ModelDir } from 'tmw-kit'
import { Helper as CtrlHelper } from 'tmw-kit/dist/ctrl/index.js'

/**
 * 集合分类控制器辅助类
 */
class DirHelper extends CtrlHelper {
  constructor(ctrl) {
    super(ctrl)
  }
  /**
   * 创建集合分类
   */
  async createDir(
    existDb,
    info,
    parentFullName?: string
  ): Promise<boolean | any> {
    let modelDir = new ModelDir(
      this.ctrl.mongoClient,
      this.ctrl.bucket,
      this.ctrl.client
    )

    return await modelDir.create(existDb, info, parentFullName)
  }
  /**
   * 创建集合分类
   */
  async updateDir(existDb, id: string, info): Promise<boolean | any> {
    let modelDir = new ModelDir(
      this.ctrl.mongoClient,
      this.ctrl.bucket,
      this.ctrl.client
    )

    return await modelDir.update(existDb, id, info)
  }
  /**
   * 创建集合分类
   */
  async removeDir(existDb, id: string): Promise<[boolean, string | null]> {
    let modelDir = new ModelDir(
      this.ctrl.mongoClient,
      this.ctrl.bucket,
      this.ctrl.client
    )

    return await modelDir.remove(existDb, id)
  }
  /**
   * 列出集合分类
   */
  async listDir(existDb): Promise<[boolean, any]> {
    const modelDir = new ModelDir(
      this.ctrl.mongoClient,
      this.ctrl.bucket,
      this.ctrl.client
    )

    let [flag, result] = await modelDir.list(existDb)
    if (!flag) {
      return [flag, result]
    }
    /**
     * 生成full_title字段
     * 是否应该提前生成好？
     */
    const mapName2Title = new Map()
    result.forEach((dir) => {
      if (dir.level === 1) {
        mapName2Title.set(dir.full_name, dir.title)
        dir.full_title = dir.title
      } else {
        const parentFullName = dir.full_name.replace(`/${dir.name}`, '')
        const parentFullTitle = mapName2Title.get(parentFullName)
        const fullTitle = parentFullTitle + `/${dir.title}`
        mapName2Title.set(dir.full_name, fullTitle)
        dir.full_title = fullTitle
      }
    })

    return [true, result]
  }
}

export default DirHelper
