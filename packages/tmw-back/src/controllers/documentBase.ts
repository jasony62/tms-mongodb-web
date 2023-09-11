import { ResultData, ResultFault } from 'tms-koa'
import { Base } from 'tmw-kit/dist/ctrl/index.js'
import { createDocWebhook } from 'tmw-kit/dist/webhook/document.js'
import DocumentHelper from './documentHelper.js'
import unrepeat from './unrepeat.js'
import { ModelDoc, ModelCl, ModelSchema, makeTagsFilter } from 'tmw-kit'
import _ from 'lodash'
import mongodb from 'mongodb'

const ObjectId = mongodb.ObjectId

/**文档对象控制器基类 */
class DocBase extends Base {
  docHelper
  docWebhook
  modelDoc
  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
    this.docHelper = new DocumentHelper(this)
    this.docWebhook = createDocWebhook(process.env.TMW_APP_WEBHOOK)
    this.modelDoc = new ModelDoc(this.mongoClient, this.bucket, this.client)
  }
  /**
   *
   * @param schema_id
   */
  private async getDocSchema(schema_id) {
    const modelSchema = new ModelSchema(
      this.mongoClient,
      this.bucket,
      this.client
    )

    // 集合的schema定义
    let docSchema
    if (schema_id && typeof schema_id === 'string')
      docSchema = await modelSchema.bySchemaId(schema_id)

    return docSchema
  }
  /**
   * 根据ID返回单个文档的数据
   * @returns
   */
  async get() {
    const existCl = await this.docHelper.findRequestCl()

    const { id, fields } = this.request.query

    let projection = {}
    let existDoc = await this.modelDoc.byId(existCl, id, projection)
    if (!existDoc) return new ResultFault('指定的文档不存在')

    return new ResultData(existDoc)
  }
  /**
   * 指定数据库指定集合下新建文档
   */
  async create() {
    const existCl = await this.docHelper.findRequestCl()

    const modelSchema = new ModelSchema(
      this.mongoClient,
      this.bucket,
      this.client
    )
    const { schema_id, extensionInfo } = existCl

    let docSchema // 集合的文档字段定义
    if (schema_id && typeof schema_id === 'string')
      docSchema = await modelSchema.bySchemaId(schema_id)

    if (!docSchema)
      return new ResultFault(
        `在集合${existCl.name}/${existCl.sysname}创建文档时，没有提供schema`
      )

    // 要新建的文档数据
    let docData = this.request.body

    // 去重校验
    const result = this.modelDoc.findUnRepeatRule(existCl)
    if (result[0]) {
      const { dbName, clName: collName, keys, insert } = result[1]
      const curDoc = [docData]
      const curConfig = {
        config: {
          columns: keys,
          db: dbName,
          cl: collName,
          insert: insert,
        },
      }
      const repeated = await unrepeat(this, curDoc, curConfig)
      if (repeated.length === 0)
        return new ResultFault('添加失败,当前数据已存在')
    }

    /**
     * 补充公共属性
     */
    if (extensionInfo) {
      const { info, schemaId } = extensionInfo
      if (schemaId) {
        const publicSchema = await modelSchema.bySchemaId(schemaId)
        Object.keys(publicSchema).forEach((schema) => {
          docData[schema] = info[schema] ? info[schema] : ''
        })
      }
    }

    // 加工数据
    this.modelDoc.processBeforeStore(docData, 'insert', docSchema)

    // 通过webhook处理数据
    let beforeRst = await this.docWebhook.beforeCreate(docData, existCl)

    if (beforeRst.passed !== true)
      return new ResultFault(
        beforeRst.reason || '操作被Webhook.beforeCreate阻止'
      )

    if (beforeRst.rewrited && typeof beforeRst.rewrited === 'object')
      docData = beforeRst.rewrited

    const newDoc = await this.modelDoc.create(existCl, docData, docSchema)

    // 通过webhook处理数据
    let afterRst = await this.docWebhook.afterCreate(newDoc, existCl)
    if (afterRst.passed !== true)
      return new ResultFault(afterRst.reason || '操作被Webhook.afterCreate阻止')

    if (afterRst.rewrited && typeof afterRst.rewrited === 'object')
      docData = afterRst.rewrited

    // 返回结果
    return new ResultData(docData)
  }
  /**
   * 删除文档
   */
  async remove() {
    const existCl = await this.docHelper.findRequestCl()

    const { id } = this.request.query

    let existDoc = await this.modelDoc.byId(existCl, id)
    if (!existDoc) return new ResultFault('要删除的文档不存在')

    if (this.tmwConfig.TMW_APP_DATA_ACTION_LOG === 'Y') {
      // 记录操作日志
      await this.modelDoc.dataActionLog(
        existDoc,
        '删除',
        existCl.db.name,
        existCl.name
      )
    }

    // 通过webhook处理数据
    let beforeRst = await this.docWebhook.beforeRemove(existDoc, existCl)

    if (beforeRst.passed !== true)
      return new ResultFault(
        beforeRst.reason || '操作被Webhook.beforeRemove阻止'
      )

    const isOk = await this.modelDoc.remove(existCl, id)
    if (!isOk) return new ResultFault('删除文档失败')

    // 通过webhook处理数据
    let afterRst = await this.docWebhook.afterRemove(existDoc, existCl)
    if (afterRst.passed !== true)
      // 被组织有什么意义吗？
      return new ResultFault(afterRst.reason || '操作被Webhook.afterRemove阻止')

    return new ResultData(isOk)
  }
  /**
   * 更新指定数据库指定集合下的文档
   */
  async update() {
    const existCl = await this.docHelper.findRequestCl()
    const { name: clName, schema_id } = existCl

    const { id } = this.request.query

    let existDoc = await this.modelDoc.byId(existCl, id)
    if (!existDoc) return new ResultFault('要更新的文档不存在')

    let newDoc = this.request.body
    const docSchema = await this.getDocSchema(schema_id)
    if (!docSchema || typeof docSchema !== 'object')
      throw Error(
        `在集合${existCl.name}/${existCl.sysname}更新文档时，没有提供schema`
      )

    // 加工数据
    this.modelDoc.processBeforeStore(newDoc, 'update', docSchema, existDoc)

    // 通过webhook处理数据
    let beforeRst = await this.docWebhook.beforeUpdate(
      { _id: id, ...newDoc },
      existCl
    )
    if (beforeRst.passed !== true)
      return new ResultFault(
        beforeRst.reason || '操作被Webhook.afterUpdate阻止'
      )
    if (beforeRst.rewrited && typeof beforeRst.rewrited === 'object')
      newDoc = beforeRst.rewrited

    let updated = _.omit(newDoc, ['_id', 'bucket'])
    const isOk = await this.modelDoc.update(existCl, id, updated)

    if (!isOk) return new ResultFault('更新文档失败')

    // 日志
    if (this.tmwConfig.TMW_APP_DATA_ACTION_LOG === 'Y') {
      let beforeDoc = {}
      beforeDoc[existDoc._id] = beforeDoc
      this.modelDoc.dataActionLog(
        newDoc,
        '修改',
        existCl.db.name,
        clName,
        '',
        '',
        beforeDoc
      )
    }

    // 通过webhook处理数据
    let afterRst = await this.docWebhook.afterUpdate(
      { _id: id, ...newDoc },
      existCl
    )
    if (afterRst.passed !== true)
      return new ResultFault(afterRst.reason || '操作被Webhook.afterUpdate阻止')

    if (afterRst.rewrited && typeof afterRst.rewrited === 'object')
      newDoc = afterRst.rewrited

    return new ResultData(newDoc)
  }
  /**
   * 替换指定数据库指定集合下的文档
   */
  async replace() {
    const existCl = await this.docHelper.findRequestCl()
    const { name: clName, schema_id } = existCl

    const { id } = this.request.query

    let existDoc = await this.modelDoc.byId(existCl, id)
    if (!existDoc) return new ResultFault('要更新的文档不存在')

    let newDoc = this.request.body
    const docSchema = await this.getDocSchema(schema_id)
    if (!docSchema || typeof docSchema !== 'object')
      throw Error(
        `在集合${existCl.name}/${existCl.sysname}更新文档时，没有提供schema`
      )

    // 加工数据
    this.modelDoc.processBeforeStore(newDoc, 'update', docSchema, existDoc)

    // 通过webhook处理数据
    let beforeRst = await this.docWebhook.beforeUpdate(
      { _id: id, ...newDoc },
      existCl
    )
    if (beforeRst.passed !== true)
      return new ResultFault(
        beforeRst.reason || '操作被Webhook.afterUpdate阻止'
      )
    if (beforeRst.rewrited && typeof beforeRst.rewrited === 'object')
      newDoc = beforeRst.rewrited

    let updated = _.omit(newDoc, ['_id', 'bucket'])
    const isOk = await this.modelDoc.replace(existCl, id, updated)

    if (!isOk) return new ResultFault('更新文档失败')

    // 日志
    if (this.tmwConfig.TMW_APP_DATA_ACTION_LOG === 'Y') {
      let beforeDoc = {}
      beforeDoc[existDoc._id] = beforeDoc
      this.modelDoc.dataActionLog(
        newDoc,
        '修改',
        existCl.db.name,
        clName,
        '',
        '',
        beforeDoc
      )
    }

    // 通过webhook处理数据
    let afterRst = await this.docWebhook.afterUpdate(
      { _id: id, ...newDoc },
      existCl
    )
    if (afterRst.passed !== true)
      return new ResultFault(afterRst.reason || '操作被Webhook.afterUpdate阻止')

    if (afterRst.rewrited && typeof afterRst.rewrited === 'object')
      newDoc = afterRst.rewrited

    return new ResultData(newDoc)
  }
  /**
   * 获得指定数据库指定集合下的文档
   */
  async list() {
    const existCl = await this.docHelper.findRequestCl()

    const { page, size, tags } = this.request.query
    let { filter, orderBy } = this.request.body

    // 包含全部标签
    if (tags) filter = makeTagsFilter(tags, filter)

    let [ok, result] = await this.modelDoc.list(
      existCl,
      { filter, orderBy },
      { page, size }
    )
    if (ok === false) return new ResultFault(result)

    return new ResultData(result)
  }
  /**
   * 在集合的向量数据库中执行意义搜索
   * 必须和插件cl-vecdb配合使用
   */
  async search() {
    const existCl = await this.docHelper.findRequestCl()
    const { model, text, size } = this.request.query

    const {
      TMW_PLUGIN_CL_VECDB_STORE_ROOT: storeRoot,
      TMW_PLUGIN_CL_VECDB_LLMKIT_NPM_SPECIFIER: llmkitNpmSpeifier,
    } = process.env

    const store = `${storeRoot}/${existCl.db.name}/${existCl.name}`
    const fs = await import('fs')
    if (!fs.existsSync(store))
      return new ResultFault('集合没有向量数据库，无法执行语义搜索')

    const { runPerset } = await import(llmkitNpmSpeifier)
    const vecDocs = await runPerset('vector-doc', { store }, text, model)
    const tmwDocs = []
    for (let vDoc of vecDocs) {
      let { _id } = vDoc.metadata
      let doc = await this.modelDoc.byId(existCl, _id)
      tmwDocs.push(doc)
    }

    return new ResultData({ vecDocs, tmwDocs })
  }
  /**
   * 按指定的列进行分组，并显示每个分组的记录数
   */
  async group() {
    const existCl = await this['docHelper'].findRequestCl()

    let { groupBy, filter } = this['request'].body
    if (!groupBy || !Array.isArray(groupBy) || groupBy.length === 0)
      return new ResultFault('参数[groupBy]无效，没有指定用于分组的列')

    let groupId = groupBy.reduce((id, column) => {
      if (column && typeof column === 'string') id[column] = '$' + column
      return id
    }, {})
    if (Object.keys(groupId).length === 0)
      return new ResultFault('参数[groupBy]包含的列名称类型错误，不是字符串')

    let cl = this['docHelper'].findSysColl(existCl)
    let query = filter ? this['modelDoc'].assembleQuery(filter) : {}
    let pipeline = [
      {
        $match: query,
      },
      {
        $group: {
          _id: groupId,
          count: {
            $sum: 1,
          },
        },
      },
    ]

    let { skip, limit } = this['docHelper'].requestPage()
    if (typeof skip === 'number') {
      skip = { $skip: skip }
      limit = { $limit: limit }
      pipeline.push(skip)
      pipeline.push(limit)
    }

    let groups = await cl.aggregate(pipeline).toArray()

    if (groups.length === 0) return new ResultData([])

    function Node(id, value) {
      this.id = id
      this.value = value
      this.children = []
    }
    function Leaf(id, value, count) {
      this.id = id
      this.value = value
      this.count = count
    }

    let leafDeepth = groupBy.length - 1 // 叶子节点的深度
    let upperNodes = [] // 保存所有父节点

    function getParent(index, group, deepth) {
      if (deepth < 0) return false
      let parentKey: any
      for (let i = 0; i <= deepth; i++) parentKey.push(group._id[groupBy[i]])
      parentKey = parentKey.join(',')
      if (upperNodes[deepth].has(parentKey))
        return upperNodes[deepth].get(parentKey)

      let node = new Node(`${index}_${deepth}`, group._id[groupBy[deepth]])
      upperNodes[deepth].set(parentKey, node)
      let parent = getParent(index, group, deepth - 1)
      if (parent) parent.children.push(node)

      return node
    }

    for (let i = 0; i < leafDeepth; i++) upperNodes.push(new Map())

    let leafColumn = groupBy[leafDeepth]
    groups.forEach((group, index) => {
      let leaf = new Leaf(
        `${index}_${leafDeepth}`,
        group._id[leafColumn],
        group.count
      )
      let parent = getParent(index, group, leafDeepth - 1)
      if (parent) parent.children.push(leaf)
      else upperNodes[0].set(leaf.value, leaf)
    })
    return new ResultData(Array.from(upperNodes[0].values()))
  }
  /**
   * 批量删除
   */
  async removeMany() {
    const { docHelper, modelDoc } = this
    const existCl = await docHelper.findRequestCl()

    const { query, operation, errCause } = docHelper.getRequestBatchQuery()
    if (errCause) return new ResultFault(errCause)

    let total = await modelDoc.count(existCl, query)
    if (total === 0)
      return new ResultFault('没有符合条件的数据，未执行删除操作')

    if (this.tmwConfig.TMW_APP_DATA_ACTION_LOG === 'Y') {
      // 记录操作日志
      let sysCl = docHelper.findSysColl(existCl)
      let removedDocs = await sysCl.find(query).toArray()
      await modelDoc.dataActionLog(
        removedDocs,
        `${operation}删除`,
        existCl.db.name,
        existCl.name
      )
    }

    return modelDoc
      .removeMany(existCl, query)
      .then((deletedCount) => new ResultData({ total, deletedCount }))
  }
  /**
   * 批量修改数据
   */
  async updateMany() {
    const existCl = await this['docHelper'].findRequestCl()

    let { columns } = this['request'].body
    if (!columns || Object.keys(columns).length === 0)
      return new ResultFault('没有指定要修改的列，未执行更新操作')

    const { query, operation, errCause } =
      this['docHelper'].getRequestBatchQuery()
    if (errCause) return new ResultFault(errCause)

    let total = await this['modelDoc'].count(existCl, query)
    if (total === 0)
      return new ResultFault('没有符合条件的数据，未执行更新操作')
    //更新前的数据记录
    let sysCl = this['docHelper'].findSysColl(existCl)
    let updateBeforeDocs = await sysCl.find(query).toArray()

    let updated = {}
    for (let key in columns) {
      updated[key] = columns[key]
    }
    // 加工数据
    this.modelDoc.processBeforeStore(updated, 'update')

    return this.modelDoc
      .updateMany(existCl, query, updated)
      .then(async (modifiedCount) => {
        if (this.tmwConfig.TMW_APP_DATA_ACTION_LOG === 'Y') {
          // 记录操作日志
          updateBeforeDocs.forEach(async (doc) => {
            let afterDoc = Object.assign({}, doc, updated)
            let beforeDoc = {}
            beforeDoc[doc._id] = doc
            await this['modelDoc'].dataActionLog(
              afterDoc,
              `${operation}修改`,
              existCl.db.name,
              existCl.name,
              '',
              '',
              beforeDoc
            )
          })
        }
        return new ResultData({ total, modifiedCount })
      })
  }
  /**
   * 批量复制数据
   */
  async copyMany() {
    const existCl = await this.docHelper.findRequestCl()

    const { toDb, toCl } = this['request'].query
    const modelCl = new ModelCl(this.mongoClient, this.bucket, this.client)
    const targetCl = await modelCl.byName(toDb, toCl)
    if (!targetCl)
      return new ResultFault(
        `指定的目标集合[db=${toDb}][cl=${targetCl}]不可访问`
      )

    const { query, operation, errCause } =
      this['docHelper'].getRequestBatchQuery()
    if (errCause) return new ResultFault(errCause)

    let total = await this.modelDoc.count(existCl, query)
    if (total === 0)
      return new ResultFault('没有符合条件的数据，未执行复制操作')

    return this.modelDoc.copyMany(existCl, query, targetCl).then(async () => {
      let existSysCl = this.docHelper.findSysColl(existCl)
      let copyedDocs = await existSysCl.find(query).toArray()
      if (this.tmwConfig.TMW_APP_DATA_ACTION_LOG === 'Y') {
        this.modelDoc.dataActionLog(
          copyedDocs,
          `${operation}复制`,
          existCl.db.name,
          existCl.name,
          targetCl.db.name,
          targetCl.name
        )
      }
      return new ResultData(total)
    })
  }
  /**
   *  根据某一列的值分组
   */
  async getGroupByColumnVal() {
    const existCl = await this.docHelper.findRequestCl()

    let { column, page = null, size = null } = this.request.query
    let { filter } = this.request.body

    let cl = this.docHelper.findSysColl(existCl)

    let find = {}
    if (filter) find = this.modelDoc.assembleQuery(filter)

    let group = [
      {
        $match: find,
      },
      {
        $group: {
          _id: '$' + column,
          num_tutorial: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]
    if (page && page > 0 && size && size > 0) {
      let skip: any = {
        $skip: (parseInt(page) - 1) * parseInt(size),
      }
      let limit: any = {
        $limit: parseInt(size),
      }
      group.push(skip)
      group.push(limit)
    }

    return cl
      .aggregate(group)
      .toArray()
      .then((arr) => {
        let data = []
        arr.forEach((a) => {
          let d = {}
          d['title'] = a._id
          d['sum'] = a.num_tutorial
          data.push(d)
        })

        return new ResultData(data)
      })
  }
  /**
   * 返回指定文档的完成度
   */
  async getDocCompleteStatusById() {
    const existCl = await this.docHelper.findRequestCl()

    let { docIds } = this.request.body
    if (!Array.isArray(docIds) || docIds.length === 0)
      return new ResultFault('没有要查询的数据')

    const docIds2 = docIds.map((id) => new ObjectId(id))
    const find = { _id: { $in: docIds2 } }

    return this.docHelper
      .findSysColl(existCl)
      .find(find)
      .toArray()
      .then(async (docs) => {
        await this.modelDoc.getDocCompleteStatus(existCl, docs)
        return docs
      })
  }
  /**
   * 导出数据
   */
  async export() {
    let { filter, docIds, columns, exportType } = this.request.body
    if (!exportType) return new ResultFault('缺少导出的文件类型参数')

    let modelDoc = new ModelDoc(this.mongoClient, this.bucket, this.client)

    let query
    if (docIds && docIds.length > 0) {
      // 按选中修改
      let docIds2 = docIds.map((id) => new ObjectId(id))
      query = { _id: { $in: docIds2 } }
    } else if (filter && typeof filter === 'object') {
      // 按条件修改
      query = modelDoc.assembleQuery(filter)
    } else if (typeof filter === 'string' && filter === 'ALL') {
      //修改全部
      query = {}
    } else {
      return new ResultFault('没有要导出的数据')
    }

    const existCl = await this.docHelper.findRequestCl()
    // 集合列
    let modelCl = new ModelCl(this.mongoClient, this.bucket, this.client)
    columns = columns ? columns : await modelCl.getSchemaByCollection(existCl)
    if (!columns) return new ResultFault('指定的集合没有指定集合列')

    const client = this.mongoClient
    // 集合数据
    let data = await client
      .db(existCl.db.sysname)
      .collection(existCl.sysname)
      .find(query)
      .toArray()

    let rst
    if (exportType === 'xlsx') {
      // 数据处理-针对单选多选转化
      this.docHelper.transformsCol('toLabel', data, columns)

      const { ExcelCtrl } = await import('tms-koa/dist/controller/fs')
      rst = ExcelCtrl.export(columns, data, existCl.name + '.xlsx')
    } else if (exportType === 'json') {
      const { ZipCtrl } = await import('./zipArchiver.js')
      //@ts-ignore
      rst = ZipCtrl.export(data, existCl.name + '.zip', { dir: existCl.name })
    }

    if (rst[0] === false) return new ResultFault(rst[1])

    rst = rst[1]

    return new ResultData(rst)
  }
}

export default DocBase
