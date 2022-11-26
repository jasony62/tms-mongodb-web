import axios from 'axios'

// WEBHOOK文档事件
enum WEBHOOK_DOC_EVENT {
  BeforeCreate = 'beforeCreate',
  AfterCreate = 'afterCreate',
  BeforeUpdate = 'beforeUpdate',
  AfterUpdate = 'afterUpdate',
  BeforeRemove = 'beforeRemove',
  AfterRemove = 'afterRemove',
}

// WEBHOOK操作返回码
enum WEBHOOK_DOC_CODE {
  PreventCode = 20400,
  RewriteCode = 20301,
}

// WEBHOOK发送的数据
type WEBHOOK_POSTED = {
  event: WEBHOOK_DOC_EVENT
  document: any
  ns: { db: string; coll: string }
}

// WEBHOOK执行结果
type WEBHOOK_RESULT = {
  passed: boolean
  reason?: string
  rewrited?: any
}

interface DocumentWebhookInf {
  /**
   * 创建文档前执行webhook
   * @param newDoc
   * @param coll
   */
  beforeCreate(newDoc: any, coll: any): Promise<WEBHOOK_RESULT>
  /**
   * 创建文档后执行webhook
   * @param newDoc
   * @param coll
   */
  afterCreate(newDoc: any, coll: any): Promise<WEBHOOK_RESULT>
  /**
   * 更新文档前执行webhook
   * @param newDoc
   * @param coll
   */
  beforeUpdate(newDoc: any, coll: any): Promise<WEBHOOK_RESULT>
  /**
   * 更新文档后执行webhook
   * @param newDoc
   * @param coll
   */
  afterUpdate(newDoc: any, coll: any): Promise<WEBHOOK_RESULT>
  /**
   * 删除文档前执行webhook
   * @param newDoc
   * @param coll
   */
  beforeRemove(newDoc: any, coll: any): Promise<WEBHOOK_RESULT>
  /**
   * 删除文档后执行webhook
   * @param newDoc
   * @param coll
   */
  afterRemove(newDoc: any, coll: any): Promise<WEBHOOK_RESULT>
}
/**
 * 空操作，简化外部代码
 */
class DocumentWebhookNoop implements DocumentWebhookInf {
  async beforeCreate(newDoc: any, coll: any) {
    return { passed: true }
  }
  async afterCreate(newDoc: any, coll: any) {
    return { passed: true }
  }
  async beforeUpdate(newDoc: any, coll: any) {
    return { passed: true }
  }
  async afterUpdate(newDoc: any, coll: any) {
    return { passed: true }
  }
  async beforeRemove(doc: any, coll: any) {
    return { passed: true }
  }
  async afterRemove(doc: any, coll: any) {
    return { passed: true }
  }
}
/**
 * 调用指定的webhook接口
 */
class DocumentWebhook implements DocumentWebhookInf {
  private _webhooUrl

  axiosInstance

  constructor(webhookUrl: string) {
    this._webhooUrl = webhookUrl
    this.axiosInstance = axios.create()
  }

  get webhookUrl() {
    return this._webhooUrl
  }

  /**
   *
   * @param evt
   * @returns
   */
  private async sendReq(evt: WEBHOOK_POSTED) {
    const rsp = await this.axiosInstance.post(this.webhookUrl, evt)
    const { msg, code, result } = rsp.data

    let ret
    switch (code) {
      case WEBHOOK_DOC_CODE.PreventCode:
        ret = { passed: false, reason: result || msg }
        break
      case WEBHOOK_DOC_CODE.RewriteCode:
        ret = { passed: true, rewrited: result }
        break
      default:
        ret = { passed: true }
    }

    return ret
  }
  /**
   * 创建文档前调用webhook
   * @param doc
   * @param coll
   */
  async beforeCreate(doc: any, coll: any): Promise<WEBHOOK_RESULT> {
    // 构造消息
    const evt = {
      event: WEBHOOK_DOC_EVENT.BeforeCreate,
      document: doc,
      ns: {
        db: coll.db.name,
        coll: coll.name,
      },
    }

    let ret = await this.sendReq(evt)

    return ret
  }

  /**
   * 创建文档后调用webhook
   * @param newDoc
   * @param coll
   */
  async afterCreate(newDoc: any, coll: any): Promise<WEBHOOK_RESULT> {
    // 构造消息
    const evt = {
      event: WEBHOOK_DOC_EVENT.AfterCreate,
      documentId: newDoc._id,
      document: newDoc,
      ns: {
        db: coll.db.name,
        coll: coll.name,
      },
    }

    let ret = await this.sendReq(evt)

    return ret
  }
  /**
   * 更新文档前调用webhook
   * @param newDoc
   * @param coll
   * @returns
   */
  async beforeUpdate(newDoc: any, coll: any): Promise<WEBHOOK_RESULT> {
    // 构造消息
    const evt = {
      event: WEBHOOK_DOC_EVENT.BeforeUpdate,
      documentId: newDoc._id,
      document: newDoc,
      ns: {
        db: coll.db.name,
        coll: coll.name,
      },
    }

    let ret = await this.sendReq(evt)

    return ret
  }
  /**
   * 更新文档后调用webhook
   * @param newDoc
   * @param coll
   * @returns
   */
  async afterUpdate(newDoc: any, coll: any): Promise<WEBHOOK_RESULT> {
    // 构造消息
    const evt = {
      event: WEBHOOK_DOC_EVENT.AfterUpdate,
      documentId: newDoc._id,
      document: newDoc,
      ns: {
        db: coll.db.name,
        coll: coll.name,
      },
    }

    let ret = await this.sendReq(evt)

    return ret
  }
  /**
   * 更新文档前调用webhook
   * @param doc
   * @param coll
   * @returns
   */
  async beforeRemove(doc: any, coll: any): Promise<WEBHOOK_RESULT> {
    // 构造消息
    const evt = {
      event: WEBHOOK_DOC_EVENT.BeforeRemove,
      documentId: doc._id,
      document: doc,
      ns: {
        db: coll.db.name,
        coll: coll.name,
      },
    }

    let ret = await this.sendReq(evt)

    return ret
  }
  /**
   * 更新文档后调用webhook
   * @param doc
   * @param coll
   * @returns
   */
  async afterRemove(doc: any, coll: any): Promise<WEBHOOK_RESULT> {
    // 构造消息
    const evt = {
      event: WEBHOOK_DOC_EVENT.AfterRemove,
      documentId: doc._id,
      document: doc,
      ns: {
        db: coll.db.name,
        coll: coll.name,
      },
    }

    let ret = await this.sendReq(evt)

    return ret
  }
}
/**
 * 提供webhook实现
 * @param webhookUrl
 * @returns
 */
export function createDocWebhook(webhookUrl: string) {
  if (webhookUrl) {
    return new DocumentWebhook(webhookUrl)
  } else {
    return new DocumentWebhookNoop()
  }
}
