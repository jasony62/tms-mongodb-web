import { ModelSpreadsheet } from 'tmw-kit'
import { Helper } from 'tmw-kit/dist/ctrl/index.js'
/**
 * 自由表格
 */
class SpreadsheetHelper extends Helper {
  modelSS
  constructor(ctrl: any) {
    super(ctrl)

    this.modelSS = new ModelSpreadsheet(
      this.ctrl.mongoClient,
      this.ctrl.bucket?.name,
      this.ctrl.client
    )
  }

  async list() {
    const db = await this.findRequestDb()
    return this.modelSS.list(db.sysname)
  }

  async byId(id: string) {
    const db = await this.findRequestDb()
    return this.modelSS.byId(db.sysname, id)
  }

  async changelog(id: string, skipVer: number) {
    const db = await this.findRequestDb()
    return this.modelSS.changelog(db.sysname, id, skipVer)
  }

  async create() {
    const db = await this.findRequestDb()
    return this.modelSS.create(db.sysname, this.ctrl.client)
  }

  async save(id: string, ver: number, delta) {
    const db = await this.findRequestDb()
    return this.modelSS.save(db.sysname, id, ver, delta, this.ctrl.client)
  }
}

export default SpreadsheetHelper
