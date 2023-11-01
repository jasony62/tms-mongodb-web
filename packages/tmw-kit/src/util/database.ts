import { ObjectId } from 'mongodb'
import dayjs from 'dayjs'
import { nanoid } from 'nanoid'
import fs from 'fs'
import { glob } from 'glob'
import path from 'path'
import Debug from 'debug'

const debug = Debug('tmw:db_init')
const trace = Debug('trace:tmw:db_init')

const TMW_CREATE_TIME = dayjs().format('YYYY-MM-DD HH:mm:ss')

/**
 * 数据库对象模板
 */
const DatabaseTemplate: any = {
  type: 'database',
  TMW_CREATE_TIME,
}
/**
 * 文档定义模板
 */
const SchemaTemplate = {
  scope: 'document',
  tags: [],
  body: {
    required: false,
    groupable: false,
    dependencies: {},
    eventDependencies: {},
    readonly: false,
    default: '',
    type: 'object',
    properties: {},
  },
  type: 'schema',
  TMW_CREATE_TIME,
}
/**
 * 集合对象模板
 */
const CollectionTemplate: any = {
  schema_tags: [],
  schema_default_tags: [],
  tags: [],
  usage: 0,
  custom: {
    docOperations: {
      create: true,
      edit: true,
      remove: true,
      editMany: true,
      removeMany: true,
      transferMany: true,
      import: true,
      export: true,
      copyMany: true,
    },
  },
  operateRules: {
    scope: {
      unrepeat: false,
    },
    unrepeat: {
      database: {},
      collection: {},
      primaryKeys: [],
      insert: false,
    },
  },
  type: 'collection',
  sysname: nanoid(10),
  TMW_CREATE_TIME,
}
/**
 * 执行初始化操作
 */
class Handler {
  client
  cl
  clTag
  options

  constructor(client: any, cl: any, clTag: any, options: any) {
    this.client = client
    this.cl = cl
    this.clTag = clTag
    this.options = options
  }

  /**
   * 创建数据库
   */
  private async createDatabase(info) {
    if (!info.name) {
      debug('缺少要创建的数据库名称参数')
      process.exit(0)
    }

    let tpl = JSON.parse(JSON.stringify(DatabaseTemplate))
    tpl.name = info.name
    tpl.sysname = info.sysname ? info.sysname : nanoid(10)

    if (info.title) tpl.title = info.title
    if (info.description) tpl.description = info.description
    if (info.bucket) tpl.bucket = info.bucket

    const query: any = { name: tpl.name, type: 'database' }
    if (info.bucket) query.bucket = info.bucket

    let db = await this.cl.findOne(query)
    if (!db) {
      await this.cl.insertOne(tpl)
      db = tpl
      debug(`创建数据库对象[name=${tpl.name}][sysname=${tpl.sysname}]`)
    } else {
      debug(
        `数据库[name=${tpl.name}][sysname=${tpl.sysname}]已经存在，不用新建`
      )
    }

    return db
  }

  /**
   * 创建文档列定义
   * 返回文档字段定义的字符串类型id
   */
  private async createSchema(info): Promise<string> {
    if (!info && info !== 'object') {
      debug('缺少要创建的schema列定义')
      process.exit(0)
    }

    const query: any = { name: info.name, scope: 'document' }
    if (info.bucket) query.bucket = info.bucket

    let replaceExisting = false // 替换已有数据
    let existSchema = await this.cl.findOne(query)
    if (existSchema) {
      if (this.options.replaceExistingSchema === true) {
        debug(`名称为[${info.name}]的文档列定义已经存在，需要替换`)
        replaceExisting = true
      } else if (this.options.allowReuseSchema === true) {
        debug(`名称为[${info.name}]的文档列定义已经存在，允许复用`)
        return existSchema._id.toString()
      } else {
        debug(
          `名称为[${info.name}]的文档列定义已经存在，不能重复创建，停止后续操作`
        )
        process.exit(0)
      }
    } else {
      delete query.name
      query.title = info.title
      existSchema = await this.cl.findOne(query)
      if (existSchema) {
        if (this.options.replaceExistingSchema === true) {
          debug(`标题为[${info.title}]的文档列定义已经存在，需要替换`)
          replaceExisting = true
        } else if (this.options.allowReuseSchema === true) {
          debug(`标题为[${info.title}]的文档列定义已经存在，允许复用`)
          return existSchema._id.toString()
        } else {
          debug(
            `标题为[${info.title}]的文档列定义已经存在，不能重复创建，停止后续操作`
          )
          process.exit(0)
        }
      }
    }

    let tpl = JSON.parse(JSON.stringify(SchemaTemplate))

    tpl.scope = 'document'
    if (info.name) tpl.name = info.name
    if (info.title) tpl.title = info.title
    if (info.description) tpl.description = info.description
    tpl.body.properties = info.properties
    tpl.order = typeof info.order === 'number' ? info.order : 99999
    if (info.parentName) tpl.parentName = info.parentName
    if (info.db && typeof info.db === 'object') {
      let { db } = info
      if (db && typeof db === 'object') {
        let { name, sysname } = db
        if (
          name &&
          typeof name === 'string' &&
          sysname &&
          typeof sysname === 'string'
        )
          tpl.db = { name, sysname }
      }
    }
    if (info.lookup) tpl.body.lookup = info.lookup

    trace('新文档定义内容：', JSON.stringify(tpl, null, 2))
    if (replaceExisting) {
      let rst = await this.cl.replaceOne({ _id: existSchema._id }, tpl)
      debug('文档定义替换结果：', JSON.stringify(rst))
      return existSchema._id.toString()
    } else {
      const { insertedId } = await this.cl.insertOne(tpl)

      if (!insertedId) {
        debug('缺少要创建的schema列定义')
        process.exit(0)
      }

      debug(`创建了文档列定义[id=${insertedId}]`)

      return insertedId.toString()
    }
  }
  /**
   * 创建集合
   * @param newDb
   * @param schemaId
   * @param info
   */
  private async createCollection(newDb: any, schemaId: string, info: any) {
    let tpl = JSON.parse(JSON.stringify(CollectionTemplate))

    // 检查集合名
    if (!info.name) {
      debug('缺少要创建的集合名称参数')
      return
    }
    if (new RegExp('^[a-zA-Z]+[0-9a-zA-Z_]{0,63}$').test(info.name) !== true) {
      debug('集合名必须以英文字母开头，仅限英文字母或_或数字组合，且最长64位')
      return
    }

    // 检查标签
    if (info.tags) {
      if (!Array.isArray(info.tags)) {
        debug('集合定义的标签格式错误')
        return
      } else {
        tpl.tags = info.tags
      }
    }

    tpl.database = newDb.name
    tpl.db = {
      sysname: newDb.sysname,
      name: newDb.name,
    }
    tpl.schema_id = schemaId
    tpl.name = info.name
    tpl.sysname = info.sysname ? info.sysname : nanoid(10)
    if (info.title) tpl.title = info.title
    if (info.description) tpl.description = info.description
    if (info.bucket) tpl.bucket = info.bucket
    if (info.docFieldConvertRules)
      tpl.docFieldConvertRules = info.docFieldConvertRules
    if (info.custom) tpl.custom = info.custom

    // 查询是否存在同名集合
    // let query = { name: cl_info.name, type: 'collection' }
    let query: any = {
      $and: [{ name: tpl.name }, { type: 'collection' }],
    }

    if (info.bucket) query['$and'].push({ bucket: info.bucket })

    if (typeof tpl.db === 'object') {
      query['$and'].push({
        $or: [{ database: tpl.database }, { 'db.sysname': tpl.db.sysname }],
      })
    } else if (typeof tpl.db === 'string') {
      query['$and'].push({
        $or: [{ database: tpl.database }, { 'db.name': tpl.db }],
      })
    }

    const existCl = await this.cl.findOne(query)
    if (existCl) {
      debug(
        `数据库[name=${newDb.name}]中，已存在同名集合[name=${tpl.name}]，不用新建，只更新集合属性`
      )
      const { name, sysname, database, db, schema_id, bucket, ...updatedInfo } =
        tpl
      await this.cl.updateOne({ _id: existCl._id }, { $set: updatedInfo })

      return existCl
    }

    // 在数据库中创建集合
    const mgdb = this.client.db(newDb.sysname)
    return mgdb.createCollection(tpl.sysname).then(() => {
      return this.cl.insertOne(tpl).then(() => {
        debug(
          `创建集合对象[db.name=${newDb.name}][db.sysname=${newDb.sysname}][name=${tpl.name}][sysname=${tpl.sysname}]`
        )
        return tpl
      })
    })
  }
  /**
   * 创建文档
   */
  private async createDocument(db, cl, docs) {
    if (!Array.isArray(docs) || docs.length === 0) {
      debug('没有提供有效的文档数据，结束创建文档操作')
      return 0
    }
    // 文档所在集合
    const docCl = this.client.db(db.sysname).collection(cl.sysname)

    /**检查集合中是否已经存在数据*/
    const total = await docCl.countDocuments()
    if (total > 0) {
      const msg = `[db=${db.sysname}][cl=${cl.sysname}]中已有[${total}]条文档`
      switch (this.options.docCreateMode) {
        case 'stop':
          debug(`${msg}，停止新建文档`)
          return 0
        case 'override':
          await docCl.deleteMany({})
          debug(`${msg}， 清除已有文档`)
          break
        case 'merge':
          debug(`${msg}， 添加新文档`)
          break
      }
    }

    let counter = 0
    for (const doc of docs) {
      if (doc._id && typeof doc._id === 'string') {
        doc._id = new ObjectId(doc._id)
      }
      const { insertedId } = await docCl.insertOne({
        ...doc,
        TMW_CREATE_TIME,
      })
      debug(
        `在[db=${db.sysname}][cl=${cl.sysname}][id=${insertedId}]创建1条文档数据`
      )
      counter++
    }

    return counter
  }
  /**
   * 创建标签
   */
  private async createTag(tags) {
    if (!Array.isArray(tags) || tags.length === 0) {
      debug('没有提供有效的标签数据，结束创建标签操作')
      return 0
    }

    let counter = 0
    for (const tag of tags) {
      tag.name = tag.name.replace(/(^\s*)|(\s*$)/g, '')

      const query: any = { name: tag.name }
      if (tag.bucket) query.bucket = tag.bucket

      let existTag = await this.clTag.findOne(query)
      if (existTag) {
        debug(`名称为[${tag.name}]的标签已经存在，不能重复创建`)
        return 0
      }

      if (tag._id && typeof tag._id === 'string') {
        tag._id = new ObjectId(tag._id)
      }
      const { insertedId } = await this.clTag.insertOne({
        ...tag,
        TMW_CREATE_TIME,
      })
      debug(`创建了标签[id=${insertedId}]`)
      counter++
    }

    return counter
  }
  /**
   * 一条初始化数据包含1个数据库，1个文档定义，1个集合，1组文档，和1组标签
   */
  async parse(info) {
    let counter = 0
    /**
     * 创建数据库
     */
    let { db, cl, docSchema, docs, tags } = info
    if (db && typeof db === 'object') {
      const newDb = await this.createDatabase(db)
      counter++
      if (docSchema && typeof docSchema === 'object') {
        /**
         * 创建schema
         */
        const schemaId = await this.createSchema(docSchema)
        counter++
        if (cl && typeof cl === 'object') {
          /**
           * 创建集合
           */
          const newCl = await this.createCollection(newDb, schemaId, cl)
          counter++
          /**
           * 插入文档
           */
          if (Array.isArray(docs) && docs.length) {
            await this.createDocument(newDb, newCl, docs)
            counter++
          }
        }
      }
    }
    /**
     * 创建标签
     */
    if (Array.isArray(tags) && tags.length) {
      await this.createTag(tags)
      counter++
    }

    return counter
  }
}

async function execute(filePath: string, mongoClient, options: any) {
  const { default: initData } = await import(filePath)
  if (!Array.isArray(initData) || initData.length === 0) {
    debug(`文件【${filePath}】的内容不是数组，跳过`)
    return
  }

  const cl = mongoClient.db('tms_admin').collection('mongodb_object')
  const clTag = mongoClient.db('tms_admin').collection('tag_object')

  const init = new Handler(mongoClient, cl, clTag, options)
  for (const data of initData) {
    await init.parse(data)
  }
}

export enum LoadDataDocCreateMode {
  Stop = 'stop',
  Override = 'override',
  Merge = 'merge',
}

export type LoadDataOptons = {
  replaceExistingSchema?: boolean
  allowReuseSchema?: boolean
  docCreateMode?: LoadDataDocCreateMode
}

export async function loadDataFrom(
  filePath,
  mongoClient,
  options?: LoadDataOptons
) {
  if (fs.existsSync(filePath)) {
    if (fs.statSync(filePath).isDirectory()) {
      let absDir = path.resolve(process.cwd(), filePath)
      const files = glob.sync(`${absDir}/**/*.js)`)
      if (files.length === 0) debug(`目录【${absDir}】中没有‘.js’结尾的文件`)
      for (let file of files) {
        debug(`指定初始化数据文件：${file}`)
        await execute(file, mongoClient, options)
      }
    } else {
      debug(`指定初始化数据文件：${filePath}`)
      await execute(filePath, mongoClient, options)
    }
    debug(`完成目录【${filePath}】中数据文件初始化操作`)
  } else {
    debug(`指定的位置【${filePath}】不存在`)
  }
}
