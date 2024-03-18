import { ObjectId } from 'mongodb'
import Base from './base.js'
import * as jsondiffpatch from 'jsondiffpatch'
import ModelSchema from './schema.js'
/**
 * 自由表格集合
 */
const SPREADSHEET_CL = 'tms_spreadsheet'
const SPREADSHEET_LOG_CL = 'tms_spreadsheet_log'

function testRowsConflict(rows, logRows) {
  const rowNumbers = Object.keys(rows)
  for (let r of rowNumbers) {
    if (rows[r]?.cells && logRows[r]?.cells) {
      const colNumbers = Object.keys(rows[r].cells)
      for (let c of colNumbers) {
        if (logRows[r].cells[c]) {
          /**
           * 不允许修改同一个单元格
           */
          return true
        }
      }
    }
  }

  return false
}
/**
 * 自由表格
 */
class Spreadsheet extends Base {
  /**
   * 检查更新是否存在冲突
   * @returns
   */
  async _testConflict(
    dbSysname: string,
    id: string,
    baseVer: number,
    delta
  ): Promise<boolean> {
    const [isOk, changelog] = await this.changelog(dbSysname, id, baseVer)
    if (!isOk) return true

    if (Array.isArray(changelog) && changelog.length) {
      /**
       * 查找是否有冲突修改
       */
      const { rows } = delta
      const conflicted = changelog.find((l) => {
        if (!l.delta) return false
        const { rows: logRows } = l.delta
        if (rows && logRows && testRowsConflict(rows, logRows)) return true

        return false
      })

      if (conflicted) return true
    }

    return false
  }
  /**
   * 根据集合创建表格
   *
   * @param cl
   * @returns
   */
  async _createClSpreadsheet(cl) {
    if (!cl?.schema_id) return { name: cl.title, rows: {} }
    const modelSc = new ModelSchema(this.mongoClient, this.bucket, this.client)
    const properties = await modelSc.bySchemaId(cl.schema_id)
    if (properties && typeof properties === 'object') {
      const rows = Object.entries(properties).reduce(
        (rows: any, [key, prop]: [string, any], index) => {
          // 第1行是列标题（中文）
          rows['0'].cells[index] = {
            text: prop.title,
            editable: false,
            style: 0,
          }
          // 第2行是列名称（英文）
          rows['1'].cells[index] = { text: key, editable: false, style: 0 }
          return rows
        },
        { '0': { cells: {} }, '1': { cells: {} } }
      )
      return {
        name: cl.title,
        rows,
        freeze: 'A3',
        cols: {
          len: Object.keys(rows['0'].cells).length,
        },
        styles: [
          {
            bgcolor: '#e7e5e6',
            align: 'center',
          },
        ],
      }
    }

    return { name: cl.title, rows: {} }
  }
  /**
   * 清理数据
   *
   * @param delta
   * @returns
   */
  sanitizeDelta(delta: any): any {
    return delta
  }
  /**
   *
   */
  spreadsheetCl(dbSysname: string) {
    const client = this.mongoClient
    const cl = client.db(dbSysname).collection(SPREADSHEET_CL)

    return cl
  }
  /**
   *
   */
  spreadsheetLogCl(dbSysname: string) {
    const client = this.mongoClient
    const cl = client.db(dbSysname).collection(SPREADSHEET_LOG_CL)

    return cl
  }
  /**
   *
   * @param dbSysname
   * @param id
   * @returns
   */
  async byId(dbSysname: string, id: string): Promise<[boolean, any]> {
    const query: any = { _id: new ObjectId(id) }
    const ss = await this.spreadsheetCl(dbSysname).findOne(query)

    return [true, ss]
  }
  async byCl(dbSysname: string, clSysname: string): Promise<[boolean, any]> {
    const query: any = { 'cl.sysname': clSysname }
    const ss = await this.spreadsheetCl(dbSysname).findOne(query)

    return [true, ss]
  }
  /**
   * 返回指定修改日志
   *
   * @param dbSysname
   * @param id
   * @param skipVer 跳过的版本
   */
  async changelog(
    dbSysname: string,
    spreadsheetId: string,
    skipVer = 0
  ): Promise<[boolean, any]> {
    const query: any = { spreadsheetId }
    const projection = { _id: 0, spreadsheetId: 0 }

    const logs = await this.spreadsheetLogCl(dbSysname)
      .find(query, { projection })
      .skip(skipVer)
      .toArray()

    return [true, logs]
  }
  /**
   *
   * @param dbSysname
   */
  async list(dbSysname: string, clSysname: string): Promise<[boolean, any]> {
    const query: any = {}
    if (clSysname) query.cl = { sysname: clSysname }
    const projection: any = { _id: 1, ver: 1 }
    const cl = this.spreadsheetCl(dbSysname)
    const ss = await cl.find(query, { projection }).toArray()

    return [true, ss]
  }
  /**
   * 创建自由表格
   *
   * 自动生成表头行
   *
   * @param dbSysname 所在的数据库名称
   * @returns 新建的自由表格文档对象或错误信息
   */
  async create(
    client,
    dbSysname: string,
    cl?: any,
    proto?: any
  ): Promise<[boolean, any]> {
    const newSS: any = { ver: 1 }
    if (cl) {
      newSS.cl = { sysname: cl.sysname }
      let clProto = await this._createClSpreadsheet(cl)
      newSS.data = [clProto]
    } else {
      newSS.data = [{ name: '表格1', rows: {} }]
    }
    /**
     * 合并rows
     */
    if (proto && typeof proto === 'object') {
      const protoRows = proto.rows
      if (protoRows) delete proto.rows
      Object.assign(newSS.data[0], proto)
      if (protoRows && newSS.data[0].rows) {
        const offset = 2
        let len = 0
        Object.entries(protoRows).forEach(([key, val]) => {
          let rIndex = parseInt(key) + offset
          newSS.data[0].rows['' + rIndex] = val
          if (rIndex > len) len = rIndex + 1
        })
        newSS.data[0].rows.len = len
      }
    }

    return this.spreadsheetCl(dbSysname)
      .insertOne(newSS)
      .then(async (result) => {
        const { insertedId } = result
        /**
         * 日志
         */
        const changelog = {
          spreadsheetId: insertedId.toString(),
          client: { id: client.id, name: client.data?.username },
          ts: Date.now(),
          ver: 1,
        }
        await this.spreadsheetLogCl(dbSysname).insertOne(changelog)

        return [true, { _id: insertedId, ver: newSS.ver, data: newSS.data }]
      })
      .catch((err) => [false, err.message])
  }
  /**
   *
   * @param dbSysname
   * @param clSysname
   * @param newSheet
   */
  async update(dbSysname: string, clSysname: string, newSheet: any) {
    const newSS = { data: [] }
    const result = await this.spreadsheetCl(dbSysname).updateOne(
      { 'cl.sysname': clSysname },
      { $set: { data: [newSheet] } }
    )

    return result
  }
  /**
   * 保存表格数据修改
   *
   * 每次修改提交的只是修改内容，格式参见jsondiffpatch库
   * 每次的修改内容记录在changelog字段中
   * 每次修改版本号（ver字段）加1
   *
   * @param dbSysname
   * @param id 文档id
   * @param ver 文档版本
   * @param delta 修改内容
   * @param client 执行操作的用户
   */
  async save(
    dbSysname: string,
    id: string,
    ver: number,
    delta,
    client
  ): Promise<[boolean, any, any?]> {
    const [isOk, oldSS] = await this.byId(dbSysname, id)
    if (!isOk) return [false, oldSS]
    if (!oldSS) return [false, '要更新的自由表格不存在']

    const { ver: oldVer, data } = oldSS
    delta = this.sanitizeDelta(delta)

    /**
     * 检查变更是否存在冲突
     */
    if (ver !== oldVer) {
      if (await this._testConflict(dbSysname, id, ver, delta)) {
        return [
          false,
          '提交数据与表格中已经更新的数据冲突，请刷新数据后重新提交',
        ]
      }
    }

    const newData = jsondiffpatch.patch(data ?? {}, delta)
    const newSS: any = { data: newData }

    return this.spreadsheetCl(dbSysname)
      .updateOne({ _id: new ObjectId(id) }, { $set: newSS, $inc: { ver: 1 } })
      .then(async ({ modifiedCount }) => {
        if (modifiedCount === 1) {
          let [isOk, ss] = await this.byId(dbSysname, id)
          /**
           * 日志
           */
          const changelog = {
            spreadsheetId: id,
            client: { id: client.id, name: client.data?.username },
            ts: Date.now(),
            delta,
            ver: ss.ver,
          }
          await this.spreadsheetLogCl(dbSysname).insertOne(changelog)

          return [isOk, ss, changelog]
        }
        return [false, `更新失败[modifiedCount=${modifiedCount}]`]
      })
      .catch((err) => [false, err.message])
  }
  /**
   * 删除集合对应的自由表格
   *
   * @param dbSysname
   * @param clSysname
   */
  async removeByCl(dbSysname: string, clSysname: string) {
    const [isOk, ss]: any = await this.byCl(dbSysname, clSysname)
    if (!isOk) return false

    if (ss) {
      return this.spreadsheetLogCl(dbSysname)
        .deleteMany({ spreadsheetId: ss._id.toString() })
        .then(() => this.spreadsheetCl(dbSysname).deleteOne({ _id: ss._id }))
    }
    return false
  }
}

export default Spreadsheet
