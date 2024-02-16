import { ModelSpreadsheet } from 'tmw-kit'
import { Helper } from 'tmw-kit/dist/ctrl/index.js'
/**
 * 记录订阅消息的用户
 */
class SubscriberStore {
  store = new Map()
  async subscribe(spreadsheetId: string, clientId: string, socket) {
    let ssStore = this.store.get(spreadsheetId)
    if (!ssStore) {
      ssStore = new Map()
      this.store.set(spreadsheetId, ssStore)
    }
    ssStore.set(socket.id, { clientId, socket })

    return true
  }
  async unsubscribe(spreadsheetId: string, clientId: string, socket) {
    let ssStore = this.store.get(spreadsheetId)
    if (ssStore) {
      ssStore.delete(socket.id)
      if (ssStore.size === 0) this.store.delete(spreadsheetId)
    }

    return true
  }

  async sendMessage(
    spreadsheetId: string,
    fromClientId: string,
    eventName: string,
    message: any
  ) {
    const ssStore = this.store.get(spreadsheetId)
    if (ssStore) {
      for (let { clientId, socket } of ssStore.values()) {
        if (clientId !== fromClientId) socket.emit(eventName, message)
      }
    }
  }
}
const Subscribers = new SubscriberStore()

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

  async subscribe(spreadsheetId: string) {
    const { socket } = this.ctrl
    Subscribers.subscribe(spreadsheetId, this.ctrl.client.id, socket)
  }

  async unsubscribe(spreadsheetId: string) {
    const { socket } = this.ctrl
    Subscribers.unsubscribe(spreadsheetId, this.ctrl.client.id, socket)
  }

  async list() {
    const db = await this.findRequestDb()
    const cl = await this.findRequestCl(false)
    return this.modelSS.list(db.sysname, cl?.sysname)
  }

  async byId(id: string) {
    const db = await this.findRequestDb()
    return this.modelSS.byId(db.sysname, id)
  }

  async changelog(id: string, skipVer: number) {
    const db = await this.findRequestDb()
    return this.modelSS.changelog(db.sysname, id, skipVer)
  }

  async create(proto?: any) {
    const db = await this.findRequestDb()
    const cl = await this.findRequestCl(false)
    return this.modelSS.create(this.ctrl.client, db.sysname, cl, proto)
  }

  async save(id: string, ver: number, delta) {
    const db = await this.findRequestDb()
    const [isOk, result, changelog] = await this.modelSS.save(
      db.sysname,
      id,
      ver,
      delta,
      this.ctrl.client
    )
    if (isOk) {
      const clientId = this.ctrl.client.id
      const { delta, ts, ver } = changelog
      const message = {
        changelog: { delta, ts, ver, client: { name: changelog.client.name } },
      }
      setTimeout(() => {
        Subscribers.sendMessage(
          changelog.spreadsheetId,
          clientId,
          'tmw-spreadsheet-save',
          message
        )
      })
    }

    return [isOk, result]
  }
}

export default SpreadsheetHelper
